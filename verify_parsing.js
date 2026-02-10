const axios = require('axios');

async function testParsing(code) {
  const holdingsUrl = `http://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10`;
  console.log(`Fetching ${holdingsUrl}...`);
  
  try {
    const response = await axios.get(holdingsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'http://fundf10.eastmoney.com/'
      }
    });
    const holdingsData = response.data;
    console.log('Data type:', typeof holdingsData);
    console.log('Data start:', holdingsData.substring(0, 100));
    console.log('Data end:', holdingsData.substring(holdingsData.length - 100));
    
    const holdings = [];
    let reportDate = '';

    if (holdingsData && typeof holdingsData === 'string') {
        // Debug regex
        const contentStart = holdingsData.indexOf('content:"');
        const recordsStart = holdingsData.indexOf('",records:');
        console.log('content index:', contentStart);
        console.log('records index:', recordsStart);
        
        // Extract content from "var apidata={ content:\"...\",arryear:..."
        const contentMatch = holdingsData.match(/content:"([\s\S]*?)",arryear:/);
        if (contentMatch) {
            // Unescape quotes
            const html = contentMatch[1].replace(/\\"/g, '"');
            
            // Find the report date from the first header "截止至：2025-09-30"
            const dateMatch = html.match(/截止至：<font class='px12'>(\d{4}-\d{2}-\d{2})<\/font>/);
            if (dateMatch) {
                reportDate = dateMatch[1];
            }

            // Extract the first table body (latest quarter)
            const tbodyMatch = html.match(/<tbody>(.*?)<\/tbody>/);
            if (tbodyMatch) {
                const rows = tbodyMatch[1].match(/<tr>(.*?)<\/tr>/g);
                if (rows) {
                    rows.forEach((row) => {
                        const cols = row.match(/<td.*?>(.*?)<\/td>/g);
                        if (cols && cols.length >= 7) {
                            // Helper to strip HTML tags
                            const stripTags = (s) => s.replace(/<[^>]+>/g, '').trim();
                            
                            const stockCode = stripTags(cols[1]);
                            const stockName = stripTags(cols[2]);
                            
                            // Find percentage column dynamically
                            let proportionStr = '0';
                            for (let i = 3; i < cols.length; i++) {
                                const text = stripTags(cols[i]);
                                if (/^\d+(\.\d+)?%$/.test(text)) {
                                    proportionStr = text.replace('%', '');
                                    break;
                                }
                            }
                            
                            console.log(`Code: ${stockCode}, Name: ${stockName}, Prop: ${proportionStr}`);
                            
                            if (stockCode && stockName) {
                                holdings.push({
                                    stockCode,
                                    stockName,
                                    proportion: parseFloat(proportionStr) || 0,
                                    shares: 0,
                                    nav: 0
                                });
                            }
                        }
                    });
                }
            }
        }
    }
    
    console.log('Report Date:', reportDate);
    console.log('Holdings:', JSON.stringify(holdings, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testParsing('000001');
