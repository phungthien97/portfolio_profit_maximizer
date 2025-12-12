const express = require('express');
const router = express.Router();
const { multiply, transpose, inv, matrix, subset } = require('mathjs');
const numeric = require('numeric');

/**
 * Generate random portfolio weights that sum to 1 (no shorts)
 * @param {number} numAssets - Number of assets
 * @returns {number[]} Array of weights summing to 1
 */
function generateRandomWeights(numAssets) {
  // Generate random numbers
  const weights = [];
  let sum = 0;
  
  for (let i = 0; i < numAssets; i++) {
    const weight = Math.random();
    weights.push(weight);
    sum += weight;
  }
  
  // Normalize to sum to 1
  return weights.map(w => w / sum);
}

/**
 * Calculate portfolio return given weights and asset returns
 * @param {number[]} weights - Portfolio weights
 * @param {number[]} returns - Asset returns
 * @returns {number} Portfolio return
 */
function calculatePortfolioReturn(weights, returns) {
  if (weights.length !== returns.length) {
    throw new Error('Weights and returns arrays must have same length');
  }
  
  let portfolioReturn = 0;
  for (let i = 0; i < weights.length; i++) {
    portfolioReturn += weights[i] * returns[i];
  }
  
  return portfolioReturn;
}

/**
 * Calculate portfolio risk (standard deviation) given weights, returns, and covariance matrix
 * @param {number[]} weights - Portfolio weights
 * @param {number[]} returns - Asset returns
 * @param {number[][]} covarianceMatrix - Covariance matrix
 * @returns {number} Portfolio risk
 */
function calculatePortfolioRisk(weights, returns, covarianceMatrix) {
  if (weights.length !== returns.length || weights.length !== covarianceMatrix.length) {
    throw new Error('Dimensions must match');
  }
  
  // Portfolio variance = w^T * Cov * w
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }
  
  return Math.sqrt(Math.max(0, variance)); // Ensure non-negative
}

/**
 * Calculate covariance matrix from returns data
 * @param {number[][]} returnsData - Array of return arrays for each asset
 * @returns {number[][]} Covariance matrix
 */
function calculateCovarianceMatrix(returnsData) {
  const numAssets = returnsData.length;
  const numPeriods = returnsData[0] ? returnsData[0].length : 0;
  
  if (numPeriods === 0) {
    throw new Error('No return data available');
  }
  
  // Calculate means for each asset
  const means = returnsData.map(returns => {
    const sum = returns.reduce((a, b) => a + b, 0);
    return sum / returns.length;
  });
  
  // Calculate covariance matrix
  const covarianceMatrix = [];
  for (let i = 0; i < numAssets; i++) {
    const row = [];
    for (let j = 0; j < numAssets; j++) {
      let covariance = 0;
      for (let k = 0; k < numPeriods; k++) {
        covariance += (returnsData[i][k] - means[i]) * (returnsData[j][k] - means[j]);
      }
      covariance /= numPeriods;
      row.push(covariance);
    }
    covarianceMatrix.push(row);
  }
  
  return covarianceMatrix;
}

/**
 * Calculate daily returns from prices
 * @param {number[]} prices - Array of prices
 * @returns {number[]} Array of daily returns
 */
function calculateDailyReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

/**
 * Solve Quadratic Programming problem for Markowitz Mean-Variance Optimization
 * Minimize: w^T * Σ * w
 * Subject to: w^T * μ = targetReturn, w^T * 1 = 1, w >= 0
 * 
 * Uses Sequential Quadratic Programming with active set method
 * 
 * @param {number[][]} covarianceMatrix - Covariance matrix Σ
 * @param {number[]} expectedReturns - Expected returns vector μ
 * @param {number} targetReturn - Target portfolio return
 * @returns {number[]} Optimal weights
 */
function solveMarkowitzQP(covarianceMatrix, expectedReturns, targetReturn, minimizeVarianceOnly = false) {
  const n = expectedReturns.length;
  
  try {
    // Initialize with smart starting point based on target
    let weights;
    if (minimizeVarianceOnly) {
      // For minimum variance, start with inverse variance weights
      const invVars = covarianceMatrix.map((row, i) => 1 / (row[i] + 1e-10));
      const sumInvVars = invVars.reduce((a, b) => a + b, 0);
      weights = invVars.map(iv => iv / sumInvVars);
    } else if (targetReturn !== null && targetReturn !== undefined) {
      // For target return, use a more direct approach
      const minRet = Math.min(...expectedReturns);
      const maxRet = Math.max(...expectedReturns);
      
      // If target is unachievable, use maximum return portfolio
      if (targetReturn > maxRet) {
        const maxRetIdx = expectedReturns.indexOf(maxRet);
        weights = new Array(n).fill(0);
        weights[maxRetIdx] = 1;
      } else if (targetReturn < minRet) {
        // If target is below minimum, use minimum variance portfolio
        const invVars = covarianceMatrix.map((row, i) => 1 / (row[i] + 1e-10));
        const sumInvVars = invVars.reduce((a, b) => a + b, 0);
        weights = invVars.map(iv => iv / sumInvVars);
      } else {
        const targetRatio = (targetReturn - minRet) / (maxRet - minRet + 1e-10);
        
        // Interpolate between minimum variance (low return) and maximum return portfolios
        const minVarWeights = covarianceMatrix.map((row, i) => {
          const invVar = 1 / (row[i] + 1e-10);
          return invVar;
        });
        const sumMinVar = minVarWeights.reduce((a, b) => a + b, 0);
        const normalizedMinVar = minVarWeights.map(w => w / sumMinVar);
        
        const maxRetIdx = expectedReturns.indexOf(maxRet);
        const maxRetWeights = new Array(n).fill(0);
        maxRetWeights[maxRetIdx] = 1;
        
        // Interpolate
        weights = normalizedMinVar.map((w, i) => w * (1 - targetRatio) + maxRetWeights[i] * targetRatio);
        const sum = weights.reduce((a, b) => a + b, 0);
        if (sum > 1e-10) {
          weights = weights.map(w => w / sum);
        } else {
          weights = new Array(n).fill(1 / n);
        }
      }
    } else {
      weights = new Array(n).fill(1 / n);
    }
    
    const maxIterations = 3000;
    const tolerance = 1e-6; // Stricter tolerance for exact return
    let stepSize = 0.05;
    
    // Use projected gradient method with constraints
    for (let iter = 0; iter < maxIterations; iter++) {
      // Calculate gradient: ∇f = 2 * Σ * w
      const gradient = [];
      for (let i = 0; i < n; i++) {
        let grad = 0;
        for (let j = 0; j < n; j++) {
          grad += 2 * covarianceMatrix[i][j] * weights[j];
        }
        gradient.push(grad);
      }
      
      // Calculate constraint violations
      const currentReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
      const returnError = minimizeVarianceOnly ? 0 : (currentReturn - targetReturn);
      const sumWeights = weights.reduce((a, b) => a + b, 0);
      const sumError = sumWeights - 1;
      
      // Project gradient onto feasible set
      // Use Lagrange multipliers for equality constraints
      // Calculate dot products manually (no numeric.matrix needed)
      const muDotMu = expectedReturns.reduce((sum, r) => sum + r * r, 0);
      const muDotOnes = expectedReturns.reduce((sum, r) => sum + r, 0);
      const muDotGrad = expectedReturns.reduce((sum, r, i) => sum + r * gradient[i], 0);
      const onesDotGrad = gradient.reduce((sum, g) => sum + g, 0);
      
      // Solve for Lagrange multipliers (simplified approach)
      // λ1 for return constraint, λ2 for sum constraint
      const A = [
        [muDotMu, muDotOnes],
        [muDotOnes, n]
      ];
      
      const b = [
        returnError + muDotGrad,
        sumError + onesDotGrad
      ];
      
      let lambda1 = 0, lambda2 = 0;
      try {
        const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        if (Math.abs(det) > 1e-10) {
          lambda1 = (b[0] * A[1][1] - b[1] * A[0][1]) / det;
          lambda2 = (A[0][0] * b[1] - A[1][0] * b[0]) / det;
        }
      } catch (e) {
        // Use simple adjustment if matrix inversion fails
        lambda1 = returnError / (n * 0.01);
        lambda2 = sumError / n;
      }
      
      // Update weights: w = w - stepSize * (gradient - λ1*μ - λ2*1)
      const newWeights = [];
      for (let i = 0; i < n; i++) {
        let newWeight = weights[i] - stepSize * (gradient[i] - lambda1 * expectedReturns[i] - lambda2);
        newWeight = Math.max(0, newWeight); // Project onto w >= 0
        newWeights.push(newWeight);
      }
      
      // Normalize to satisfy sum constraint
      const sum = newWeights.reduce((a, b) => a + b, 0);
      if (sum > 1e-10) {
        weights = newWeights.map(w => w / sum);
      } else {
        // If all weights become zero, reset to equal weights
        weights = new Array(n).fill(1 / n);
      }
      
      // Check convergence - require exact return match
      const returnConverged = minimizeVarianceOnly || Math.abs(returnError) < tolerance;
      const sumConverged = Math.abs(sumError) < tolerance;
      
      if (returnConverged && sumConverged) {
        break;
      }
      
      // Adaptive step size - reduce if not converging well
      if (iter > 200 && (Math.abs(returnError) > 0.01 || Math.abs(sumError) > 0.01)) {
        stepSize *= 0.95;
        if (stepSize < 0.0001) stepSize = 0.0001;
      }
      
      // Increase step size if converging well (but not too much)
      if (iter > 50 && Math.abs(returnError) < 0.005 && Math.abs(sumError) < 0.005 && stepSize < 0.2) {
        stepSize *= 1.05;
        if (stepSize > 0.2) stepSize = 0.2;
      }
      
      // If return error is large, adjust weights more aggressively toward target
      if (!minimizeVarianceOnly && Math.abs(returnError) > 0.01) {
        // Direct adjustment: shift weights toward assets that help achieve target return
        const returnAdjustment = returnError * 0.2;
        for (let i = 0; i < n; i++) {
          const returnContribution = expectedReturns[i] - currentReturn;
          if (returnError > 0 && returnContribution > 0) {
            // Need higher return, increase weight in higher return assets
            weights[i] += returnAdjustment * returnContribution * weights[i];
          } else if (returnError < 0 && returnContribution < 0) {
            // Need lower return, increase weight in lower return assets
            weights[i] += Math.abs(returnAdjustment) * Math.abs(returnContribution) * weights[i];
          }
          weights[i] = Math.max(0, weights[i]);
        }
        // Renormalize
        const sum = weights.reduce((a, b) => a + b, 0);
        if (sum > 1e-10) {
          weights = weights.map(w => w / sum);
        }
      }
    }
    
    // Final normalization and constraint satisfaction
    const finalSum = weights.reduce((a, b) => a + b, 0);
    if (finalSum > 0) {
      weights = weights.map(w => w / finalSum);
    }
    
    // Final refinement: ensure return is exactly at target (if specified)
    if (!minimizeVarianceOnly && targetReturn !== null && targetReturn !== undefined) {
      let finalReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
      let finalError = Math.abs(finalReturn - targetReturn);
      let prevError = finalError;
      let adaptiveStep = 0.5;
      
      // Check if target is achievable
      const maxRet = Math.max(...expectedReturns);
      const isUnachievable = targetReturn > maxRet;
      
      // Iterative refinement to get exact return (or as close as possible)
      for (let refineIter = 0; refineIter < 200 && finalError > 1e-5; refineIter++) {
        const error = targetReturn - finalReturn;
        
        // If target is unachievable and we're at max return, stop
        if (isUnachievable && Math.abs(finalReturn - maxRet) < 1e-6) {
          break;
        }
        
        // Calculate gradient of return with respect to weights
        // For each asset, how much does increasing its weight increase return?
        const returnGradients = expectedReturns.map((ret, i) => ret - finalReturn);
        
        // Use adaptive step size
        const baseFactor = Math.min(1.0, Math.abs(error) * 10);
        const adjustmentFactor = error * adaptiveStep * baseFactor;
        
        const newWeights = weights.map((w, i) => {
          const adjustment = adjustmentFactor * returnGradients[i] * (w + 0.01);
          return Math.max(0, w + adjustment);
        });
        
        // Renormalize
        const sum = newWeights.reduce((a, b) => a + b, 0);
        if (sum > 1e-10) {
          weights = newWeights.map(w => w / sum);
          const newReturn = weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
          const newError = Math.abs(newReturn - targetReturn);
          
          if (newError < finalError) {
            finalReturn = newReturn;
            prevError = finalError;
            finalError = newError;
            adaptiveStep = Math.min(1.0, adaptiveStep * 1.1); // Increase step if improving
          } else {
            adaptiveStep *= 0.7; // Reduce step if not improving
            if (adaptiveStep < 0.01) adaptiveStep = 0.01;
          }
        } else {
          break; // Can't normalize, stop
        }
        
        // If error increased or not improving, stop
        if (refineIter > 20 && finalError >= prevError * 0.99) {
          break;
        }
        
        // If we're very close, stop
        if (finalError < 1e-5) {
          break;
        }
      }
    }
    
    return weights;
  } catch (error) {
    // Fallback: Use interpolation-based approach instead of equal weights
    console.warn('QP solver failed, using interpolation approach:', error.message);
    
    if (minimizeVarianceOnly) {
      // Minimum variance: inverse variance weights
      const invVars = covarianceMatrix.map((row, i) => 1 / (row[i] + 1e-10));
      const sumInvVars = invVars.reduce((a, b) => a + b, 0);
      return invVars.map(iv => iv / sumInvVars);
    } else if (targetReturn !== null && targetReturn !== undefined) {
      // Interpolate between min variance and max return
      const minRet = Math.min(...expectedReturns);
      const maxRet = Math.max(...expectedReturns);
      const targetRatio = Math.max(0, Math.min(1, (targetReturn - minRet) / (maxRet - minRet + 1e-10)));
      
      // Min variance weights
      const invVars = covarianceMatrix.map((row, i) => 1 / (row[i] + 1e-10));
      const sumInvVars = invVars.reduce((a, b) => a + b, 0);
      const minVarWeights = invVars.map(iv => iv / sumInvVars);
      
      // Max return weights
      const maxRetIdx = expectedReturns.indexOf(maxRet);
      const maxRetWeights = new Array(n).fill(0);
      maxRetWeights[maxRetIdx] = 1;
      
      // Interpolate
      const weights = minVarWeights.map((w, i) => w * (1 - targetRatio) + maxRetWeights[i] * targetRatio);
      const sum = weights.reduce((a, b) => a + b, 0);
      return sum > 1e-10 ? weights.map(w => w / sum) : new Array(n).fill(1 / n);
    }
    
    // Last resort: equal weights
    return new Array(n).fill(1 / n);
  }
}

/**
 * Generate efficient frontier using Markowitz Mean-Variance Optimization
 * @param {number[][]} covarianceMatrix - Covariance matrix
 * @param {number[]} expectedReturns - Expected returns
 * @param {number} numPoints - Number of points on frontier
 * @returns {Array} Array of {risk, return, weights} objects
 */
function generateEfficientFrontier(covarianceMatrix, expectedReturns, numPoints = 500) {
  const n = expectedReturns.length;
  
  // Find min and max achievable returns by solving for minimum variance and maximum return portfolios
  // First, find minimum variance portfolio (global minimum)
  const minVarWeights = solveMarkowitzQP(covarianceMatrix, expectedReturns, null, true); // true = minimize variance only
  const minVarReturn = calculatePortfolioReturn(minVarWeights, expectedReturns);
  const minVarRisk = calculatePortfolioRisk(minVarWeights, expectedReturns, covarianceMatrix);
  
  // Find maximum return portfolio (100% in highest return asset)
  const maxReturnIdx = expectedReturns.indexOf(Math.max(...expectedReturns));
  const maxReturnWeights = new Array(n).fill(0);
  maxReturnWeights[maxReturnIdx] = 1;
  const maxReturn = calculatePortfolioReturn(maxReturnWeights, expectedReturns);
  const maxReturnRisk = calculatePortfolioRisk(maxReturnWeights, expectedReturns, covarianceMatrix);
  
  // Use actual achievable range
  const minReturn = minVarReturn;
  const maxReturnActual = maxReturn;
  
  // Generate target returns across the range
  const targetReturns = [];
  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    targetReturns.push(minReturn + (maxReturnActual - minReturn) * t);
  }
  
  const frontierPoints = [];
  const seenPoints = new Set(); // Track unique points to avoid duplicates
  let qpFailures = 0;
  
  for (const targetReturn of targetReturns) {
    try {
      // Solve QP for this target return
      const weights = solveMarkowitzQP(covarianceMatrix, expectedReturns, targetReturn);
      
      // Calculate actual return and risk
      const actualReturn = calculatePortfolioReturn(weights, expectedReturns);
      const actualRisk = calculatePortfolioRisk(weights, expectedReturns, covarianceMatrix);
      
      // Create a unique key for this point (round to avoid floating point duplicates)
      // Use finer granularity to allow more points
      const returnKey = Math.round(actualReturn * 100000) / 100000;
      const riskKey = Math.round(actualRisk * 100000) / 100000;
      const pointKey = `${returnKey}_${riskKey}`;
      
      // Only add if we haven't seen this point before (allow more granularity)
      if (!seenPoints.has(pointKey)) {
        seenPoints.add(pointKey);
        frontierPoints.push({
          return: actualReturn * 100, // Convert to percentage
          risk: actualRisk * 100,
          weights: weights.map((w, idx) => w) // Store raw weights, will map to assets later
        });
      }
    } catch (error) {
      qpFailures++;
      // Even if QP fails, use interpolation fallback to generate a point
      try {
        const minRet = Math.min(...expectedReturns);
        const maxRet = Math.max(...expectedReturns);
        const targetRatio = Math.max(0, Math.min(1, (targetReturn - minRet) / (maxRet - minRet + 1e-10)));
        
        // Min variance weights
        const invVars = covarianceMatrix.map((row, i) => 1 / (row[i] + 1e-10));
        const sumInvVars = invVars.reduce((a, b) => a + b, 0);
        const minVarWeights = invVars.map(iv => iv / sumInvVars);
        
        // Max return weights
        const maxRetIdx = expectedReturns.indexOf(maxRet);
        const maxRetWeights = new Array(n).fill(0);
        maxRetWeights[maxRetIdx] = 1;
        
        // Interpolate
        const weights = minVarWeights.map((w, i) => w * (1 - targetRatio) + maxRetWeights[i] * targetRatio);
        const sum = weights.reduce((a, b) => a + b, 0);
        const normalizedWeights = sum > 1e-10 ? weights.map(w => w / sum) : new Array(n).fill(1 / n);
        
        // Calculate return and risk for interpolated portfolio
        const actualReturn = calculatePortfolioReturn(normalizedWeights, expectedReturns);
        const actualRisk = calculatePortfolioRisk(normalizedWeights, expectedReturns, covarianceMatrix);
        
        const returnKey = Math.round(actualReturn * 100000) / 100000;
        const riskKey = Math.round(actualRisk * 100000) / 100000;
        const pointKey = `${returnKey}_${riskKey}`;
        
        if (!seenPoints.has(pointKey)) {
          seenPoints.add(pointKey);
          frontierPoints.push({
            return: actualReturn * 100,
            risk: actualRisk * 100,
            weights: normalizedWeights.map((w, idx) => w)
          });
        }
      } catch (fallbackError) {
        // Skip this point if even fallback fails
        continue;
      }
    }
  }
  
  if (qpFailures > 0) {
    console.log(`QP solver failed for ${qpFailures} points, used interpolation fallback`);
  }
  
  console.log(`Generated ${frontierPoints.length} raw frontier points before filtering`);
  
  // Sort by risk
  frontierPoints.sort((a, b) => a.risk - b.risk);
  
  // If we have enough points, just return them (maybe filter for efficiency later)
  // For now, ensure we return at least numPoints
  if (frontierPoints.length >= numPoints) {
    // Take evenly spaced points to get exactly numPoints
    const step = Math.max(1, Math.floor(frontierPoints.length / numPoints));
    const efficientPoints = [];
    for (let i = 0; i < frontierPoints.length && efficientPoints.length < numPoints; i += step) {
      efficientPoints.push(frontierPoints[i]);
    }
    // Fill remaining slots if needed
    while (efficientPoints.length < numPoints && efficientPoints.length < frontierPoints.length) {
      efficientPoints.push(frontierPoints[efficientPoints.length]);
    }
    console.log(`Returning ${efficientPoints.length} efficient frontier points`);
    return efficientPoints;
  }
  
  // If we don't have enough points, use interpolation to generate more
  console.log(`Only have ${frontierPoints.length} points, generating more via interpolation`);
  const efficientPoints = [...frontierPoints];
  
  // Generate additional points via interpolation if needed
  while (efficientPoints.length < numPoints) {
    const currentCount = efficientPoints.length;
    const needed = numPoints - currentCount;
    
    // Generate additional target returns
    for (let i = 0; i < needed && efficientPoints.length < numPoints; i++) {
      const ratio = (i + 1) / (needed + 1);
      const targetReturn = minReturn + (maxReturnActual - minReturn) * ratio;
      
      // Use interpolation
      const targetRatio = Math.max(0, Math.min(1, (targetReturn - minReturn) / (maxReturnActual - minReturn + 1e-10)));
      
      // Min variance weights
      const invVars = covarianceMatrix.map((row, i) => 1 / (row[i] + 1e-10));
      const sumInvVars = invVars.reduce((a, b) => a + b, 0);
      const minVarWeights = invVars.map(iv => iv / sumInvVars);
      
      // Max return weights
      const maxRetIdx = expectedReturns.indexOf(Math.max(...expectedReturns));
      const maxRetWeights = new Array(n).fill(0);
      maxRetWeights[maxRetIdx] = 1;
      
      // Interpolate
      const weights = minVarWeights.map((w, idx) => w * (1 - targetRatio) + maxRetWeights[idx] * targetRatio);
      const sum = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = sum > 1e-10 ? weights.map(w => w / sum) : new Array(n).fill(1 / n);
      
      // Calculate return and risk
      const actualReturn = calculatePortfolioReturn(normalizedWeights, expectedReturns);
      const actualRisk = calculatePortfolioRisk(normalizedWeights, expectedReturns, covarianceMatrix);
      
      efficientPoints.push({
        return: actualReturn * 100,
        risk: actualRisk * 100,
        weights: normalizedWeights.map((w, idx) => w)
      });
    }
    
    // Sort and deduplicate
    efficientPoints.sort((a, b) => a.risk - b.risk);
    
    // Remove duplicates
    const uniquePoints = [];
    const seen = new Set();
    for (const point of efficientPoints) {
      const key = `${Math.round(point.risk * 1000)}_${Math.round(point.return * 1000)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePoints.push(point);
      }
    }
    
    efficientPoints.length = 0;
    efficientPoints.push(...uniquePoints);
    
    // Break if we can't generate more unique points
    if (efficientPoints.length === currentCount) {
      break;
    }
  }
  
  // Sort final result
  efficientPoints.sort((a, b) => a.risk - b.risk);
  console.log(`Final efficient frontier has ${efficientPoints.length} points`);
  
  return efficientPoints.slice(0, numPoints); // Return exactly numPoints
}

/**
 * POST /optimization/frontier
 * Compute Efficient Frontier using Markowitz Mean-Variance Optimization (Quadratic Programming)
 * Body: { metrics: object from /calculations/metrics, data: object from /data/fetch, assets: string[] }
 */
router.post('/frontier', (req, res) => {
  try {
    const { metrics, data, assets } = req.body;

    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({
        error: {
          message: 'Metrics object is required',
          status: 400
        }
      });
    }

    if (!assets || !Array.isArray(assets) || assets.length < 2) {
      return res.status(400).json({
        error: {
          message: 'At least 2 assets are required for portfolio optimization',
          status: 400
        }
      });
    }

    // Validate all assets have valid metrics
    const validAssets = [];
    const assetReturns = [];
    const assetRisks = [];
    const returnsData = [];

    for (const asset of assets) {
      const symbol = asset.trim().toUpperCase();
      const assetMetrics = metrics[symbol];

      if (!assetMetrics || assetMetrics.return === null || assetMetrics.risk === null) {
        continue;
      }

      // Get price data for covariance calculation
      const assetData = data && data[symbol];
      if (!assetData || !assetData.hasData || !assetData.prices || assetData.prices.length < 2) {
        continue;
      }

      validAssets.push(symbol);
      assetReturns.push(assetMetrics.return / 100); // Convert to decimal
      assetRisks.push(assetMetrics.risk / 100); // Convert to decimal
      
      // Calculate daily returns for covariance
      const dailyReturns = calculateDailyReturns(assetData.prices);
      returnsData.push(dailyReturns);
    }

    if (validAssets.length < 2) {
      return res.status(400).json({
        error: {
          message: 'At least 2 assets with valid data are required',
          status: 400
        }
      });
    }

    // Calculate covariance matrix
    // Align return arrays to same length (use minimum length)
    const minLength = Math.min(...returnsData.map(r => r.length));
    const alignedReturnsData = returnsData.map(r => r.slice(0, minLength));
    
    let covarianceMatrix;
    try {
      covarianceMatrix = calculateCovarianceMatrix(alignedReturnsData);
    } catch (error) {
      // Fallback: use simplified correlation assumption
      // Create covariance matrix from individual risks
      covarianceMatrix = [];
      for (let i = 0; i < validAssets.length; i++) {
        const row = [];
        for (let j = 0; j < validAssets.length; j++) {
          if (i === j) {
            row.push(assetRisks[i] * assetRisks[i]); // Variance
          } else {
            // Assume correlation of 0.5 (can be improved)
            row.push(assetRisks[i] * assetRisks[j] * 0.5);
          }
        }
        covarianceMatrix.push(row);
      }
    }

    // Generate efficient frontier using Markowitz Mean-Variance Optimization
    const numFrontierPoints = 500; // Number of points on the efficient frontier
    
    const frontierPointsRaw = generateEfficientFrontier(
      covarianceMatrix,
      assetReturns,
      numFrontierPoints
    );
    
    // Log for debugging
    console.log(`Generated ${frontierPointsRaw.length} frontier points`);
    
    // Map asset indices to actual symbols
    const frontierPoints = frontierPointsRaw.map(point => ({
      risk: parseFloat(point.risk.toFixed(2)),
      return: parseFloat(point.return.toFixed(2)),
      weights: point.weights.map((weight, idx) => ({
        asset: validAssets[idx],
        weight: parseFloat(weight.toFixed(4))
      }))
    }));
    
    // If we have fewer points than requested, log a warning
    if (frontierPoints.length < numFrontierPoints / 2) {
      console.warn(`Only generated ${frontierPoints.length} frontier points, expected around ${numFrontierPoints}`);
    } else {
      console.log(`Successfully generated ${frontierPoints.length} frontier points`);
    }
    
    // Find min and max returns from frontier
    const returns = frontierPoints.map(p => p.return);
    const minReturn = returns.length > 0 ? parseFloat(Math.min(...returns).toFixed(2)) : 0;
    const maxReturn = returns.length > 0 ? parseFloat(Math.max(...returns).toFixed(2)) : 0;

    res.status(200).json({
      points: frontierPoints,
      minReturn,
      maxReturn,
      summary: {
        method: 'Markowitz Mean-Variance Optimization (QP)',
        frontierPoints: frontierPoints.length,
        assets: validAssets
      }
    });
  } catch (error) {
    console.error('Error in frontier computation:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: {
        message: 'Failed to compute efficient frontier. Please try again.',
        status: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

/**
 * POST /optimization/allocation
 * Find optimal allocation for given expected return by solving QP for exact return
 * Body: { frontier: object from /optimization/frontier, expectedReturn: number, investmentAmount: number, metrics: object, data: object, assets: array }
 */
router.post('/allocation', (req, res) => {
  try {
    const { frontier, expectedReturn, investmentAmount, metrics, data, assets } = req.body;

    if (expectedReturn === undefined || expectedReturn === null) {
      return res.status(400).json({
        error: {
          message: 'Expected return is required',
          status: 400
        }
      });
    }

    if (!investmentAmount || investmentAmount <= 0) {
      return res.status(400).json({
        error: {
          message: 'Investment amount must be a positive number',
          status: 400
        }
      });
    }

    // Validate expected return is within range (if frontier provided)
    if (frontier) {
      if (expectedReturn < frontier.minReturn || expectedReturn > frontier.maxReturn) {
        return res.status(400).json({
          error: {
            message: `Expected return must be between ${frontier.minReturn}% and ${frontier.maxReturn}%`,
            status: 400,
            minReturn: frontier.minReturn,
            maxReturn: frontier.maxReturn
          }
        });
      }
    }

    // If we have metrics and data, solve directly for exact return using QP
    let optimalWeights = null;
    let portfolioReturn = null;
    let portfolioRisk = null;
    let validAssets = [];

    if (metrics && data && assets && Array.isArray(assets)) {
      // Extract asset data
      const assetReturns = [];
      const returnsData = [];

      for (const asset of assets) {
        const symbol = asset.trim().toUpperCase();
        const assetMetrics = metrics[symbol];

        if (!assetMetrics || assetMetrics.return === null || assetMetrics.risk === null) {
          continue;
        }

        const assetData = data && data[symbol];
        if (!assetData || !assetData.hasData || !assetData.prices || assetData.prices.length < 2) {
          continue;
        }

        validAssets.push(symbol);
        assetReturns.push(assetMetrics.return / 100); // Convert to decimal
        const dailyReturns = calculateDailyReturns(assetData.prices);
        returnsData.push(dailyReturns);
      }

      if (validAssets.length >= 2) {
        // Calculate covariance matrix
        const minLength = Math.min(...returnsData.map(r => r.length));
        const alignedReturnsData = returnsData.map(r => r.slice(0, minLength));
        
        let covarianceMatrix;
        try {
          covarianceMatrix = calculateCovarianceMatrix(alignedReturnsData);
        } catch (error) {
          // Fallback: use simplified correlation assumption
          const assetRisks = validAssets.map(symbol => (metrics[symbol].risk / 100));
          covarianceMatrix = [];
          for (let i = 0; i < validAssets.length; i++) {
            const row = [];
            for (let j = 0; j < validAssets.length; j++) {
              if (i === j) {
                row.push(assetRisks[i] * assetRisks[i]);
              } else {
                row.push(assetRisks[i] * assetRisks[j] * 0.5);
              }
            }
            covarianceMatrix.push(row);
          }
        }

        // Solve QP for exact target return (convert from percentage to decimal)
        const targetReturnDecimal = expectedReturn / 100;
        
        // First, check what the maximum achievable return is
        const maxReturnIdx = assetReturns.indexOf(Math.max(...assetReturns));
        const maxReturnWeights = new Array(assetReturns.length).fill(0);
        maxReturnWeights[maxReturnIdx] = 1;
        const maxAchievableReturn = calculatePortfolioReturn(maxReturnWeights, assetReturns);
        
        // If target is higher than maximum achievable, use maximum return portfolio
        let targetReturnToUse = targetReturnDecimal;
        let isTargetUnachievable = false;
        if (targetReturnDecimal > maxAchievableReturn) {
          isTargetUnachievable = true;
          targetReturnToUse = maxAchievableReturn;
          console.log(`Target return ${(targetReturnDecimal * 100).toFixed(2)}% exceeds maximum achievable ${(maxAchievableReturn * 100).toFixed(2)}%, using maximum return portfolio`);
        }
        
        try {
          optimalWeights = solveMarkowitzQP(covarianceMatrix, assetReturns, targetReturnToUse);
          
          // Calculate actual return and risk
          portfolioReturn = calculatePortfolioReturn(optimalWeights, assetReturns);
          portfolioRisk = calculatePortfolioRisk(optimalWeights, assetReturns, covarianceMatrix);
          
          // Refine if return is not exact enough - use iterative refinement
          let returnError = Math.abs(portfolioReturn - targetReturnToUse);
          if (returnError > 1e-6) {
            // Iteratively refine to get exact return
            let refinedWeights = [...optimalWeights];
            let prevError = returnError;
            let adaptiveStepSize = 0.5; // Start with larger step size
            let noImprovementCount = 0;
            
            for (let refineIter = 0; refineIter < 500 && returnError > 1e-6; refineIter++) {
              const currentReturn = calculatePortfolioReturn(refinedWeights, assetReturns);
              const error = targetReturnToUse - currentReturn;
              
              // Calculate return gradients
              const returnGradients = assetReturns.map((ret, i) => ret - currentReturn);
              
              // Use adaptive step size - larger when error is large, smaller when close
              const baseAdjustmentFactor = Math.min(1.0, Math.abs(error) * 10);
              const adjustmentFactor = error * adaptiveStepSize * baseAdjustmentFactor;
              
              const newWeights = refinedWeights.map((w, i) => {
                // For assets with higher returns, increase weight more aggressively
                const gradient = returnGradients[i];
                const adjustment = adjustmentFactor * gradient * (w + 0.01); // Add small base to avoid zero weights
                return Math.max(0, w + adjustment);
              });
              
              // Renormalize
              const sum = newWeights.reduce((a, b) => a + b, 0);
              if (sum > 1e-10) {
                refinedWeights = newWeights.map(w => w / sum);
                const newReturn = calculatePortfolioReturn(refinedWeights, assetReturns);
                const newError = Math.abs(newReturn - targetReturnToUse);
                
                if (newError < returnError) {
                  // Improvement - accept and continue
                  optimalWeights = refinedWeights;
                  portfolioReturn = newReturn;
                  portfolioRisk = calculatePortfolioRisk(optimalWeights, assetReturns, covarianceMatrix);
                  prevError = returnError;
                  returnError = newError;
                  noImprovementCount = 0;
                  // Increase step size slightly if making good progress
                  if (returnError < prevError * 0.9) {
                    adaptiveStepSize = Math.min(1.0, adaptiveStepSize * 1.1);
                  }
                } else {
                  // No improvement - reduce step size and try again
                  noImprovementCount++;
                  adaptiveStepSize *= 0.7;
                  if (adaptiveStepSize < 0.01) {
                    adaptiveStepSize = 0.01;
                  }
                  
                  // If no improvement for many iterations, try different approach
                  if (noImprovementCount > 20) {
                    // Try more aggressive adjustment by focusing on highest return assets
                    const sortedIndices = assetReturns
                      .map((ret, idx) => ({ ret, idx }))
                      .sort((a, b) => b.ret - a.ret);
                    
                    // Shift more weight to top return assets
                    for (let i = 0; i < Math.min(3, sortedIndices.length); i++) {
                      const idx = sortedIndices[i].idx;
                      if (error > 0 && currentReturn < targetReturnToUse) {
                        refinedWeights[idx] += 0.05;
                      }
                    }
                    // Renormalize
                    const sum2 = refinedWeights.reduce((a, b) => a + b, 0);
                    if (sum2 > 1e-10) {
                      refinedWeights = refinedWeights.map(w => w / sum2);
                      noImprovementCount = 0;
                    }
                  }
                  
                  // If still no improvement after many attempts, break
                  if (noImprovementCount > 50) {
                    break;
                  }
                }
              } else {
                break; // Can't normalize, stop
              }
              
              // If very close, stop
              if (returnError < 1e-5) {
                break;
              }
            }
            
            // Final attempt: if still not close enough and target is achievable, try solving for multiple nearby targets
            if (returnError > 0.001 && !isTargetUnachievable) {
              // Try solving for slightly higher target to see if we can get closer
              for (let attempt = 0; attempt < 5 && returnError > 0.001; attempt++) {
                const adjustedTarget = targetReturnToUse + (targetReturnToUse - portfolioReturn) * 0.1;
                if (adjustedTarget <= maxAchievableReturn) {
                  try {
                    const testWeights = solveMarkowitzQP(covarianceMatrix, assetReturns, adjustedTarget);
                    const testReturn = calculatePortfolioReturn(testWeights, assetReturns);
                    const testError = Math.abs(testReturn - targetReturnToUse);
                    if (testError < returnError) {
                      optimalWeights = testWeights;
                      portfolioReturn = testReturn;
                      portfolioRisk = calculatePortfolioRisk(optimalWeights, assetReturns, covarianceMatrix);
                      returnError = testError;
                    }
                  } catch (e) {
                    // Ignore errors in test attempts
                  }
                }
              }
            }
          }
        } catch (qpError) {
          console.warn('QP solver failed in allocation, will use frontier fallback:', qpError.message);
        }
      }
    }

    // Fallback to frontier if QP solving failed or if we need to find closest point
    if ((!optimalWeights || Math.abs(portfolioReturn * 100 - expectedReturn) > 0.1) && frontier && frontier.points) {
      // Find point on frontier closest to expected return with minimum risk
      let bestPoint = null;
      let minDistance = Infinity;
      let minRisk = Infinity;

      for (const point of frontier.points) {
        const distance = Math.abs(point.return - expectedReturn);
        // Prefer points closer to target, and if same distance, prefer lower risk
        if (distance < minDistance || (Math.abs(distance - minDistance) < 0.01 && point.risk < minRisk)) {
          bestPoint = point;
          minDistance = distance;
          minRisk = point.risk;
        }
      }

      if (bestPoint) {
        // Extract weights from frontier point
        optimalWeights = bestPoint.weights.map(w => w.weight);
        portfolioReturn = bestPoint.return / 100; // Convert back to decimal
        portfolioRisk = bestPoint.risk / 100;
        validAssets = bestPoint.weights.map(w => w.asset);
        
        // If we have metrics/data, try to refine this further using QP
        if (metrics && data && validAssets.length >= 2) {
          const currentReturnPercent = portfolioReturn * 100;
          const returnError = Math.abs(currentReturnPercent - expectedReturn);
          
          // If we're still far off, try solving QP directly for the frontier point's return
          if (returnError > 0.1) {
            try {
              const refinedWeights = solveMarkowitzQP(covarianceMatrix, assetReturns, portfolioReturn);
              const refinedReturn = calculatePortfolioReturn(refinedWeights, assetReturns);
              const refinedRisk = calculatePortfolioRisk(refinedWeights, assetReturns, covarianceMatrix);
              
              // Use refined weights if they're better
              if (Math.abs(refinedReturn * 100 - expectedReturn) <= returnError) {
                optimalWeights = refinedWeights;
                portfolioReturn = refinedReturn;
                portfolioRisk = refinedRisk;
              }
            } catch (e) {
              // Keep using frontier point if refinement fails
            }
          }
        }
      }
    }

    if (!optimalWeights || optimalWeights.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Could not compute optimal allocation for given return',
          status: 400
        }
      });
    }

    // Calculate allocations in percentages and dollar amounts
    const allocations = {};
    let totalPercent = 0;
    
    // Find the asset with largest allocation for explanation
    let maxWeightIdx = 0;
    let maxWeight = 0;
    for (let i = 0; i < optimalWeights.length; i++) {
      if (optimalWeights[i] > maxWeight) {
        maxWeight = optimalWeights[i];
        maxWeightIdx = i;
      }
    }

    for (let i = 0; i < optimalWeights.length; i++) {
      const asset = validAssets[i];
      const weight = optimalWeights[i];
      const percent = weight * 100;
      const amount = investmentAmount * weight;
      
      allocations[asset] = {
        percent: parseFloat(percent.toFixed(2)),
        amount: parseFloat(amount.toFixed(2))
      };
      
      totalPercent += percent;
    }

    // Generate explanation
    const actualReturnPercent = portfolioReturn * 100;
    const returnDifference = Math.abs(actualReturnPercent - expectedReturn);
    let explanation = `This allocation minimizes risk (${(portfolioRisk * 100).toFixed(2)}%) while achieving an expected return of exactly ${expectedReturn.toFixed(2)}%. `;
    
    if (returnDifference > 0.01) {
      explanation = `This allocation minimizes risk (${(portfolioRisk * 100).toFixed(2)}%) while targeting an expected return of ${expectedReturn.toFixed(2)}%. The optimized portfolio achieves a return of ${actualReturnPercent.toFixed(2)}%. `;
    }
    
    explanation += `The portfolio is diversified across ${validAssets.length} assets, with the largest allocation to ${validAssets[maxWeightIdx]} (${allocations[validAssets[maxWeightIdx]].percent.toFixed(2)}%).`;

    res.status(200).json({
      allocations,
      portfolioMetrics: {
        expectedReturn: parseFloat(actualReturnPercent.toFixed(2)),
        requestedReturn: parseFloat(expectedReturn.toFixed(2)),
        risk: parseFloat((portfolioRisk * 100).toFixed(2))
      },
      explanation,
      investmentAmount: parseFloat(investmentAmount.toFixed(2))
    });
  } catch (error) {
    console.error('Error in allocation optimization:', error);
    res.status(500).json({
      error: {
        message: 'Failed to compute optimal allocation. Please try again.',
        status: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

module.exports = router;


