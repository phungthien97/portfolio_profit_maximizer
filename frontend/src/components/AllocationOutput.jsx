import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import Plot from 'react-plotly.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useApp } from '../context/AppContext';
import { computeAllocation } from '../services/api';
import { formatCurrency, formatCurrencyAmount } from '../utils/currencyFormatter';

ChartJS.register(ArcElement, Tooltip, Legend);

const AllocationOutput = () => {
  const navigate = useNavigate();
  const {
    frontier,
    investmentAmount,
    expectedReturn,
    allocation,
    setAllocation,
    assets,
    metrics,
    historicalData,
    currency,
    startDate,
    endDate
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projectionYears, setProjectionYears] = useState(5);
  const [projectionData, setProjectionData] = useState(null);

  useEffect(() => {
    if (!allocation && frontier && investmentAmount && expectedReturn) {
      fetchAllocation();
    }
  }, []);

  useEffect(() => {
    if (allocation && projectionYears > 0 && investmentAmount) {
      calculateProjection();
    }
  }, [allocation, projectionYears, investmentAmount]);

  const fetchAllocation = async () => {
    setLoading(true);
    setError('');

    try {
      const returnValue = parseFloat(expectedReturn);
      const amountValue = parseInt(investmentAmount);

      // Pass metrics, data, and assets for exact return calculation
      const assetSymbols = assets.map(a => a.symbol);
      const response = await computeAllocation(
        frontier, 
        returnValue, 
        amountValue, 
        metrics, 
        historicalData, 
        assetSymbols
      );
      setAllocation(response.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to compute allocation');
      console.error('Error computing allocation:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjection = () => {
    if (!allocation || !investmentAmount) return;

    const initialAmount = parseFloat(investmentAmount);
    const annualReturn = allocation.portfolioMetrics.expectedReturn / 100; // Convert to decimal
    const annualRisk = allocation.portfolioMetrics.risk / 100; // Convert to decimal

    const years = [];
    const portfolioValues = [];
    const riskValues = [];
    const upperBound = []; // Upper confidence bound (return + 1.96 * risk)
    const lowerBound = []; // Lower confidence bound (return - 1.96 * risk)

    for (let year = 0; year <= projectionYears; year++) {
      years.push(year);
      
      // Calculate portfolio value using compound growth
      const portfolioValue = initialAmount * Math.pow(1 + annualReturn, year);
      portfolioValues.push(portfolioValue);

      // Risk compounds with square root of time (for annualized risk)
      // Risk at year t = annualRisk * sqrt(t)
      const riskAtYear = annualRisk * Math.sqrt(year);
      riskValues.push(riskAtYear * 100); // Convert back to percentage

      // Calculate confidence bounds (95% confidence interval)
      // Using normal distribution approximation
      const stdDevAtYear = portfolioValue * riskAtYear;
      upperBound.push(portfolioValue + 1.96 * stdDevAtYear);
      lowerBound.push(Math.max(0, portfolioValue - 1.96 * stdDevAtYear));
    }

    setProjectionData({
      years,
      portfolioValues,
      riskValues,
      upperBound,
      lowerBound
    });
  };

  const handleProjectionYearsChange = (e) => {
    const value = e.target.value;
    // Only allow positive whole numbers
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0 && parseInt(value) <= 50)) {
      setProjectionYears(value === '' ? 10 : parseInt(value));
    }
  };

  // Helper function to convert Plotly graph to base64 image using html2canvas
  const plotlyToImage = async (data, layout, config = {}) => {
    try {
      console.log('Starting Plotly image conversion using html2canvas...');
      
      // Try to get Plotly from window (should be available from react-plotly.js)
      let PlotlyLib;
      if (typeof window !== 'undefined' && window.Plotly) {
        PlotlyLib = window.Plotly;
        console.log('Using window.Plotly');
      } else {
        console.error('Plotly not available on window object');
        return null;
      }
      
      if (!PlotlyLib || !PlotlyLib.newPlot) {
        console.error('Plotly not properly loaded');
        return null;
      }
      
      // Create a temporary hidden div element for Plotly
      const tempDiv = document.createElement('div');
      tempDiv.id = 'temp-plotly-div-' + Date.now();
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.height = '500px';
      tempDiv.style.visibility = 'hidden';
      document.body.appendChild(tempDiv);
      
      try {
        console.log('Creating Plotly graph...');
        // Create the plot with explicit dimensions
        const plotLayout = { 
          ...layout, 
          width: 800, 
          height: 500,
          autosize: false
        };
        const plotConfig = { 
          ...config, 
          displayModeBar: false,
          staticPlot: true
        };
        
        await PlotlyLib.newPlot(tempDiv, data, plotLayout, plotConfig);
        
        console.log('Waiting for Plotly to render...');
        // Wait for Plotly to fully render - use Plotly's afterplot event
        await new Promise((resolve) => {
          const checkRender = () => {
            // Check if the plot is rendered by looking for SVG elements
            const svg = tempDiv.querySelector('svg');
            if (svg && svg.children.length > 0) {
              resolve();
            } else {
              setTimeout(checkRender, 100);
            }
          };
          // Start checking after initial delay
          setTimeout(checkRender, 500);
          // Fallback timeout
          setTimeout(resolve, 2000);
        });
        
        // Additional wait to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Try Plotly's built-in toImage method first (more reliable for SVG)
        let imageDataUrl = null;
        if (PlotlyLib.toImage) {
          try {
            console.log('Trying Plotly.toImage method...');
            imageDataUrl = await PlotlyLib.toImage(tempDiv, { 
              format: 'png', 
              width: 800, 
              height: 500 
            });
            console.log('Plotly.toImage successful, data URL length:', imageDataUrl ? imageDataUrl.length : 0);
          } catch (toImageError) {
            console.warn('Plotly.toImage failed, falling back to html2canvas:', toImageError);
          }
        }
        
        // Fallback to html2canvas if Plotly.toImage didn't work
        if (!imageDataUrl) {
          console.log('Using html2canvas to capture graph...');
          const canvas = await html2canvas(tempDiv, {
            width: 800,
            height: 500,
            useCORS: true,
            scale: 1,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: true
          });
          
          console.log('Canvas created, dimensions:', canvas.width, 'x', canvas.height);
          
          // Verify canvas has content (check if it's not blank)
          const ctx = canvas.getContext('2d');
          const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
          const hasContent = imageData.data.some((val, idx) => idx % 4 !== 3 && val !== 0); // Check non-alpha channels
          
          if (!hasContent) {
            console.warn('Canvas appears to be blank');
          }
          
          // Convert canvas to base64 image
          imageDataUrl = canvas.toDataURL('image/png');
          console.log('html2canvas conversion successful, data URL length:', imageDataUrl.length);
        }
        
        return imageDataUrl;
      } catch (plotError) {
        console.error('Error in Plotly/html2canvas operations:', plotError);
        return null;
      } finally {
        // Clean up
        try {
          if (tempDiv.parentNode) {
            if (PlotlyLib && PlotlyLib.purge) {
              PlotlyLib.purge(tempDiv);
            }
            document.body.removeChild(tempDiv);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temp div:', cleanupError);
        }
      }
    } catch (error) {
      console.error('Error converting Plotly graph to image:', error);
      return null;
    }
  };

  const handleExportPDF = async () => {
    if (!allocation) {
      console.error('Cannot export PDF: allocation data is missing');
      alert('Cannot export PDF: allocation data is missing. Please wait for the allocation to be calculated.');
      return;
    }

    // Show loading message
    const loadingMsg = 'Generating PDF with graphs... This may take a moment.';
    console.log(loadingMsg);
    
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const pageHeight = 280;
      const margin = 20;
      const rightMargin = 190;

      // Helper function to check if new page is needed
      const checkNewPage = (requiredSpace = 10) => {
      if (yPos + requiredSpace > pageHeight) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Portfolio Profit Maximizer - Complete Analysis Report', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Created by Thien Phung', 20, yPos);
    yPos += 7;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
    yPos += 15;

    // ========== STEP 0: CURRENCY SELECTION ==========
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Step 0: Currency Selection', 20, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Selected Currency: ${currency}`, 20, yPos);
    yPos += 12;

    // ========== STEP 1: PORTFOLIO ASSETS ==========
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Step 1: Portfolio Assets', 20, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Assets: ${assets.length}`, 20, yPos);
    yPos += 7;
    
    assets.forEach((asset) => {
      checkNewPage(7);
      doc.text(`• ${asset.symbol}: ${asset.name}`, 25, yPos);
      yPos += 7;
    });
    yPos += 8;

    // ========== STEP 2: TIMELINE ==========
    checkNewPage(10);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Step 2: Analysis Timeline', 20, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    if (startDate && endDate) {
      const startStr = startDate instanceof Date ? startDate.toLocaleDateString() : startDate;
      const endStr = endDate instanceof Date ? endDate.toLocaleDateString() : endDate;
      const daysDiff = startDate instanceof Date && endDate instanceof Date
        ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        : 'N/A';
      doc.text(`Start Date: ${startStr}`, 20, yPos);
      yPos += 7;
      doc.text(`End Date: ${endStr}`, 20, yPos);
      yPos += 7;
      doc.text(`Analysis Period: ${daysDiff} days`, 20, yPos);
    } else {
      doc.text('Date range not specified', 20, yPos);
    }
    yPos += 12;

    // ========== STEP 3 & 4: METRICS AND EFFICIENT FRONTIER ==========
    if (metrics) {
      checkNewPage(20);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Step 3 & 4: Asset Metrics', 20, yPos);
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      // Metrics table header
      checkNewPage(15);
      doc.setFont(undefined, 'bold');
      doc.text('Symbol', 20, yPos);
      doc.text('Return %', 70, yPos);
      doc.text('Risk %', 110, yPos);
      doc.text('Min Price', 150, yPos);
      doc.text('Max Price', 180, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      
      // Metrics table rows
      Object.entries(metrics).forEach(([symbol, metric]) => {
        checkNewPage(7);
        doc.text(symbol, 20, yPos);
        doc.text(metric.return !== null ? `${metric.return.toFixed(2)}%` : 'N/A', 70, yPos);
        doc.text(metric.risk !== null ? `${metric.risk.toFixed(2)}%` : 'N/A', 110, yPos);
        doc.text(formatCurrencyAmount(metric.minPrice), 150, yPos);
        doc.text(formatCurrencyAmount(metric.maxPrice), 180, yPos);
        yPos += 7;
      });
      yPos += 8;
    }

    // Efficient Frontier Info
    if (frontier) {
      checkNewPage(15);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Efficient Frontier Summary', 20, yPos);
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Minimum Achievable Return: ${frontier.minReturn.toFixed(2)}%`, 20, yPos);
      yPos += 7;
      doc.text(`Maximum Achievable Return: ${frontier.maxReturn.toFixed(2)}%`, 20, yPos);
      yPos += 7;
      doc.text(`Frontier Points Calculated: ${frontier.points ? frontier.points.length : 0}`, 20, yPos);
      yPos += 12;

      // Add Efficient Frontier Graph
      if (frontier.points && frontier.points.length > 0) {
        checkNewPage(200);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Efficient Frontier Graph', 20, yPos);
        yPos += 8;
        
        try {
          const frontierGraphData = [{
            x: frontier.points.map(p => p.risk),
            y: frontier.points.map(p => p.return),
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Efficient Frontier',
            line: { color: '#3B82F6', width: 2 },
            marker: { size: 6 }
          }];
          
          const frontierLayout = {
            title: {
              text: 'Efficient Frontier',
              font: { size: 18 }
            },
            xaxis: {
              title: { text: 'Risk (%)', font: { size: 14 } },
              showgrid: true,
              gridcolor: '#E5E7EB'
            },
            yaxis: {
              title: { text: 'Return (%)', font: { size: 14 } },
              showgrid: true,
              gridcolor: '#E5E7EB'
            },
            plot_bgcolor: '#FFFFFF',
            paper_bgcolor: '#FFFFFF',
            margin: { l: 60, r: 20, t: 60, b: 60 }
          };

          console.log('Generating frontier graph image...');
          const frontierImage = await plotlyToImage(frontierGraphData, frontierLayout);
          if (frontierImage) {
            console.log('Frontier image generated, adding to PDF...');
            console.log('Image data length:', frontierImage.length);
            console.log('Image data preview:', frontierImage.substring(0, 50));
            console.log('Current yPos before image:', yPos);
            
            // Ensure we have enough space on the page (100mm height + 10mm margin)
            checkNewPage(110);
            
            // Ensure image is in correct format (base64 data URL)
            const imageSrc = frontierImage.startsWith('data:') ? frontierImage : `data:image/png;base64,${frontierImage}`;
            
            try {
              doc.addImage(imageSrc, 'PNG', 20, yPos, 170, 100);
              console.log('Frontier graph added to PDF at yPos:', yPos);
              yPos += 110;
            } catch (imgError) {
              console.error('Error adding image to PDF:', imgError);
              doc.setFontSize(10);
              doc.setFont(undefined, 'italic');
              doc.text('(Error adding graph to PDF)', 20, yPos);
              yPos += 7;
            }
          } else {
            console.warn('Frontier image generation returned null');
            doc.setFontSize(10);
            doc.setFont(undefined, 'italic');
            doc.text('(Graph could not be generated)', 20, yPos);
            yPos += 7;
          }
        } catch (error) {
          console.error('Error adding frontier graph to PDF:', error);
          console.error('Error details:', error.message, error.stack);
          doc.setFontSize(10);
          doc.setFont(undefined, 'italic');
          doc.text('(Graph could not be included)', 20, yPos);
          yPos += 7;
        }
        yPos += 10;
      }
    }

    // ========== STEP 5: INVESTMENT INPUTS ==========
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Step 5: Investment Parameters', 20, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Investment Amount: ${formatCurrency(parseInt(investmentAmount), currency)}`, 20, yPos);
    yPos += 7;
    doc.text(`Expected Return: ${parseFloat(expectedReturn).toFixed(2)}%`, 20, yPos);
    yPos += 12;

    // ========== STEP 6: OPTIMIZED ALLOCATION ==========
    checkNewPage(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Step 6: Optimized Portfolio Allocation', 20, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    
    // Portfolio Metrics
    doc.text(`Requested Return: ${allocation.portfolioMetrics.requestedReturn?.toFixed(2) || parseFloat(expectedReturn).toFixed(2)}%`, 20, yPos);
    yPos += 7;
    doc.text(`Optimized Return: ${allocation.portfolioMetrics.expectedReturn.toFixed(2)}%`, 20, yPos);
    yPos += 7; // Move to next line before adding note
    if (allocation.portfolioMetrics.requestedReturn && 
        Math.abs(allocation.portfolioMetrics.expectedReturn - allocation.portfolioMetrics.requestedReturn) > 0.01) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('(closest achievable point on efficient frontier)', 25, yPos);
      yPos += 7;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
    }
    doc.text(`Portfolio Risk: ${allocation.portfolioMetrics.risk.toFixed(2)}%`, 20, yPos);
    yPos += 10;

    // Allocation Table
    checkNewPage(15);
    doc.setFont(undefined, 'bold');
    doc.text('Asset', 20, yPos);
    doc.text('Percentage', 80, yPos);
    doc.text(`Amount (${currency})`, 140, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');

    Object.entries(allocation.allocations).forEach(([symbol, alloc]) => {
      checkNewPage(7);
      doc.text(symbol, 20, yPos);
      doc.text(`${alloc.percent.toFixed(2)}%`, 80, yPos);
      doc.text(formatCurrencyAmount(alloc.amount), 140, yPos);
      yPos += 7;
    });
    yPos += 10;

    // Explanation
    checkNewPage(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Allocation Explanation', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const explanationLines = doc.splitTextToSize(allocation.explanation, 170);
    explanationLines.forEach((line) => {
      checkNewPage(7);
      doc.text(line, 20, yPos);
      yPos += 7;
    });
    yPos += 10;

    // ========== STEP 7: PROJECTION SUMMARY ==========
    if (projectionData && projectionData.portfolioValues.length > 0) {
      checkNewPage(25);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Step 7: Portfolio Projection Summary', 20, yPos);
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      
      const finalValue = projectionData.portfolioValues[projectionData.portfolioValues.length - 1];
      const totalReturn = ((finalValue / parseFloat(investmentAmount)) - 1) * 100;
      const finalRisk = projectionData.riskValues[projectionData.riskValues.length - 1];
      
      doc.text(`Projection Period: ${projectionYears} years`, 20, yPos);
      yPos += 7;
      doc.text(`Initial Investment: ${formatCurrency(parseFloat(investmentAmount), currency)}`, 20, yPos);
      yPos += 7;
      doc.text(`Projected Value (${projectionYears} years): ${formatCurrency(finalValue, currency)}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Return: ${totalReturn.toFixed(2)}%`, 20, yPos);
      yPos += 7;
      doc.text(`Projected Risk (Year ${projectionYears}): ${finalRisk.toFixed(2)}%`, 20, yPos);
      yPos += 7;
      
      // Show confidence interval
      const upper = projectionData.upperBound[projectionData.upperBound.length - 1];
      const lower = projectionData.lowerBound[projectionData.lowerBound.length - 1];
      doc.text(`95% Confidence Interval: ${formatCurrency(lower, currency)} - ${formatCurrency(upper, currency)}`, 20, yPos);
      yPos += 12;

      // Add Portfolio Projection Graphs
      checkNewPage(200);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Portfolio Growth Projection Graph', 20, yPos);
      yPos += 8;
      
      try {
        const projectionGraphData = [
          {
            x: projectionData.years,
            y: projectionData.portfolioValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Portfolio Value',
            line: { color: '#3B82F6', width: 3 }
          },
          {
            x: projectionData.years,
            y: projectionData.upperBound,
            type: 'scatter',
            mode: 'lines',
            name: 'Upper Bound (95%)',
            line: { color: '#10B981', width: 1, dash: 'dash' }
          },
          {
            x: projectionData.years,
            y: projectionData.lowerBound,
            type: 'scatter',
            mode: 'lines',
            name: 'Lower Bound (95%)',
            line: { color: '#EF4444', width: 1, dash: 'dash' },
            fill: 'tonexty',
            fillcolor: 'rgba(59, 130, 246, 0.1)'
          }
        ];
        
        const projectionLayout = {
          title: {
            text: 'Portfolio Growth Projection',
            font: { size: 16 }
          },
          xaxis: {
            title: { text: 'Years', font: { size: 14 } },
            showgrid: true,
            gridcolor: '#E5E7EB'
          },
          yaxis: {
            title: { text: `Portfolio Value (${currency})`, font: { size: 14 } },
            showgrid: true,
            gridcolor: '#E5E7EB',
            tickformat: ',.0f'
          },
          plot_bgcolor: '#FFFFFF',
          paper_bgcolor: '#FFFFFF',
          showlegend: true,
          margin: { l: 60, r: 20, t: 60, b: 60 }
        };

        console.log('Generating projection graph image...');
        const projectionImage = await plotlyToImage(projectionGraphData, projectionLayout);
        if (projectionImage) {
          console.log('Projection image generated, adding to PDF...');
          console.log('Image data length:', projectionImage.length);
          console.log('Current yPos before image:', yPos);
          
          // Ensure we have enough space on the page
          checkNewPage(110);
          
          const imageSrc = projectionImage.startsWith('data:') ? projectionImage : `data:image/png;base64,${projectionImage}`;
          
          try {
            doc.addImage(imageSrc, 'PNG', 20, yPos, 170, 100);
            console.log('Projection graph added to PDF at yPos:', yPos);
            yPos += 110;
          } catch (imgError) {
            console.error('Error adding projection image to PDF:', imgError);
            doc.setFontSize(10);
            doc.setFont(undefined, 'italic');
            doc.text('(Error adding graph to PDF)', 20, yPos);
            yPos += 7;
          }
        } else {
          console.warn('Projection image generation returned null');
          doc.setFontSize(10);
          doc.setFont(undefined, 'italic');
          doc.text('(Graph could not be generated)', 20, yPos);
          yPos += 7;
        }
      } catch (error) {
        console.error('Error adding projection graph to PDF:', error);
        console.error('Error details:', error.message, error.stack);
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text('(Graph could not be included)', 20, yPos);
        yPos += 7;
      }
      yPos += 10;

      // Add Portfolio Risk Projection Graph
      checkNewPage(200);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Portfolio Risk Projection Graph', 20, yPos);
      yPos += 8;
      
      try {
        const riskGraphData = [
          {
            x: projectionData.years,
            y: projectionData.riskValues,
            type: 'scatter',
            mode: 'lines',
            name: 'Portfolio Risk',
            line: { color: '#EF4444', width: 3 }
          }
        ];
        
        const riskLayout = {
          title: {
            text: 'Portfolio Risk Projection',
            font: { size: 16 }
          },
          xaxis: {
            title: { text: 'Years', font: { size: 14 } },
            showgrid: true,
            gridcolor: '#E5E7EB'
          },
          yaxis: {
            title: { text: 'Risk (%)', font: { size: 14 } },
            showgrid: true,
            gridcolor: '#E5E7EB'
          },
          plot_bgcolor: '#FFFFFF',
          paper_bgcolor: '#FFFFFF',
          showlegend: true,
          margin: { l: 60, r: 20, t: 60, b: 60 }
        };

        console.log('Generating risk graph image...');
        const riskImage = await plotlyToImage(riskGraphData, riskLayout);
        if (riskImage) {
          console.log('Risk image generated, adding to PDF...');
          console.log('Image data length:', riskImage.length);
          console.log('Current yPos before image:', yPos);
          
          // Ensure we have enough space on the page
          checkNewPage(110);
          
          const imageSrc = riskImage.startsWith('data:') ? riskImage : `data:image/png;base64,${riskImage}`;
          
          try {
            doc.addImage(imageSrc, 'PNG', 20, yPos, 170, 100);
            console.log('Risk graph added to PDF at yPos:', yPos);
            yPos += 110;
          } catch (imgError) {
            console.error('Error adding risk image to PDF:', imgError);
            doc.setFontSize(10);
            doc.setFont(undefined, 'italic');
            doc.text('(Error adding graph to PDF)', 20, yPos);
            yPos += 7;
          }
        } else {
          console.warn('Risk image generation returned null');
          doc.setFontSize(10);
          doc.setFont(undefined, 'italic');
          doc.text('(Graph could not be generated)', 20, yPos);
          yPos += 7;
        }
      } catch (error) {
        console.error('Error adding risk graph to PDF:', error);
        console.error('Error details:', error.message, error.stack);
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text('(Graph could not be included)', 20, yPos);
        yPos += 7;
      }
      yPos += 10;
    }

    // Footer
    checkNewPage(15);
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text('This report was generated by Portfolio Profit Maximizer', 20, yPos);
    yPos += 7;
    doc.text('Created by Thien Phung', 20, yPos);
    yPos += 7;
    doc.text('For educational and informational purposes only. Not financial advice.', 20, yPos);

    doc.save('portfolio-complete-analysis-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check the console for details.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Computing optimal allocation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => navigate('/investment')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!allocation) {
    return null;
  }

  const pieData = {
    labels: Object.keys(allocation.allocations),
    datasets: [
      {
        data: Object.values(allocation.allocations).map(a => a.percent),
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#EC4899',
          '#06B6D4',
          '#84CC16'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Step 7: Optimized Allocation Output
        </h2>

        {/* Portfolio Metrics Summary */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Portfolio Metrics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Requested Return:</span>{' '}
              <span className="font-semibold">{allocation.portfolioMetrics.requestedReturn?.toFixed(2) || expectedReturn}%</span>
            </div>
            <div>
              <span className="text-blue-700">Optimized Return:</span>{' '}
              <span className="font-semibold">{allocation.portfolioMetrics.expectedReturn.toFixed(2)}%</span>
              {allocation.portfolioMetrics.requestedReturn && 
               Math.abs(allocation.portfolioMetrics.expectedReturn - allocation.portfolioMetrics.requestedReturn) > 0.01 && (
                <span className="text-xs text-blue-600 ml-2">(closest on frontier)</span>
              )}
            </div>
            <div>
              <span className="text-blue-700">Portfolio Risk:</span>{' '}
              <span className="font-semibold">{allocation.portfolioMetrics.risk.toFixed(2)}%</span>
            </div>
          </div>
          {allocation.portfolioMetrics.requestedReturn && 
           Math.abs(allocation.portfolioMetrics.expectedReturn - allocation.portfolioMetrics.requestedReturn) > 0.01 && (
            <p className="text-xs text-blue-600 mt-2">
              Note: The optimized return may differ slightly from your requested return as it represents the closest achievable point on the efficient frontier.
            </p>
          )}
        </div>

        {/* Pie Chart */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Allocation Visualization</h3>
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: true }} />
            </div>
          </div>
        </div>

        {/* Allocation Table */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Allocation</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount ({currency})
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(allocation.allocations).map(([symbol, alloc]) => (
                  <tr key={symbol}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alloc.percent.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrencyAmount(alloc.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Explanation */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Explanation</h3>
          <p className="text-sm text-gray-700">{allocation.explanation}</p>
        </div>

        {/* Portfolio Projection Graph */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Portfolio Projection</h3>
            <div className="flex items-center gap-2">
              <label htmlFor="projection-years" className="text-sm text-gray-700">
                Projection Years:
              </label>
              <input
                id="projection-years"
                type="text"
                value={projectionYears}
                onChange={handleProjectionYearsChange}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10"
              />
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Projected portfolio growth and risk over the selected time period. The shaded area represents a 95% confidence interval.
          </p>

          {projectionData && (
            <div className="bg-white p-4 border border-gray-200 rounded-md">
              <Plot
                data={[
                  {
                    x: projectionData.years,
                    y: projectionData.portfolioValues,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Portfolio Value',
                    line: { color: '#3B82F6', width: 3 },
                    hovertemplate: '<b>Year:</b> %{x}<br><b>Value:</b> ' + currency + ' %{y:,.2f}<extra></extra>'
                  },
                  {
                    x: projectionData.years,
                    y: projectionData.upperBound,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Upper Bound (95%)',
                    line: { color: '#10B981', width: 1, dash: 'dash' },
                    hovertemplate: '<b>Year:</b> %{x}<br><b>Upper Bound:</b> ' + currency + ' %{y:,.2f}<extra></extra>'
                  },
                  {
                    x: projectionData.years,
                    y: projectionData.lowerBound,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Lower Bound (95%)',
                    line: { color: '#EF4444', width: 1, dash: 'dash' },
                    fill: 'tonexty',
                    fillcolor: 'rgba(59, 130, 246, 0.1)',
                    hovertemplate: '<b>Year:</b> %{x}<br><b>Lower Bound:</b> ' + currency + ' %{y:,.2f}<extra></extra>'
                  }
                ]}
                layout={{
                  title: {
                    text: 'Portfolio Growth Projection',
                    font: { size: 16 }
                  },
                  xaxis: {
                    title: {
                      text: 'Years',
                      font: { size: 14 }
                    },
                    showgrid: true,
                    gridcolor: '#E5E7EB'
                  },
                  yaxis: {
                    title: {
                      text: `Portfolio Value (${currency})`,
                      font: { size: 14 }
                    },
                    showgrid: true,
                    gridcolor: '#E5E7EB',
                    tickformat: ',.0f'
                  },
                  hovermode: 'closest',
                  height: 400,
                  showlegend: true,
                  plot_bgcolor: '#FFFFFF',
                  paper_bgcolor: '#FFFFFF',
                  legend: {
                    x: 0,
                    y: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.8)'
                  }
                }}
                style={{ width: '100%', height: '400px' }}
                config={{ responsive: true }}
              />
            </div>
          )}

          {projectionData && (
            <div className="mt-4 bg-white p-4 border border-gray-200 rounded-md">
              <Plot
                data={[
                  {
                    x: projectionData.years,
                    y: projectionData.riskValues,
                    type: 'scatter',
                    mode: 'lines',
                    name: 'Portfolio Risk',
                    line: { color: '#EF4444', width: 3 },
                    hovertemplate: '<b>Year:</b> %{x}<br><b>Risk:</b> %{y:.2f}%<extra></extra>'
                  }
                ]}
                layout={{
                  title: {
                    text: 'Portfolio Risk Projection',
                    font: { size: 16 }
                  },
                  xaxis: {
                    title: {
                      text: 'Years',
                      font: { size: 14 }
                    },
                    showgrid: true,
                    gridcolor: '#E5E7EB'
                  },
                  yaxis: {
                    title: {
                      text: 'Risk (%)',
                      font: { size: 14 }
                    },
                    showgrid: true,
                    gridcolor: '#E5E7EB'
                  },
                  hovermode: 'closest',
                  height: 350,
                  showlegend: true,
                  plot_bgcolor: '#FFFFFF',
                  paper_bgcolor: '#FFFFFF'
                }}
                style={{ width: '100%', height: '350px' }}
                config={{ responsive: true }}
              />
            </div>
          )}

          {projectionData && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700 font-medium">Initial Investment</p>
                <p className="text-lg font-semibold text-blue-900">
                  {formatCurrency(parseFloat(investmentAmount), currency)}
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700 font-medium">Projected Value ({projectionYears} years)</p>
                <p className="text-lg font-semibold text-green-900">
                  {formatCurrency(projectionData.portfolioValues[projectionData.portfolioValues.length - 1], currency)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                <p className="text-sm text-purple-700 font-medium">Total Return</p>
                <p className="text-lg font-semibold text-purple-900">
                  {(((projectionData.portfolioValues[projectionData.portfolioValues.length - 1] / parseFloat(investmentAmount)) - 1) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/investment')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleExportPDF}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Export PDF Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllocationOutput;

