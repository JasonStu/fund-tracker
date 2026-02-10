import axios from 'axios';
import { getFundHoldings } from '../fundService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('fundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse multiple quarters of holdings correctly', async () => {
    // Escape quotes properly for the mock HTML string as it appears in JS variable
    const mockHtml = `var apidata={ content:"<div class='box'><div class='boxitem'><h4 class='t'>2023-09-30</h4><table><tbody><tr><td>1</td><td>600519</td><td>Moutai</td><td>5.12%</td><td>...</td><td>...</td><td>...</td></tr></tbody></table></div><div class='boxitem'><h4 class='t'>2023-06-30</h4><table><tbody><tr><td>1</td><td>000858</td><td>Wuliangye</td><td>4.88%</td><td>...</td><td>...</td><td>...</td></tr></tbody></table></div></div>",arryear:2023};`;
    
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('fundgz')) {
        return Promise.resolve({ data: 'jsonpgz({"name":"Test Fund","dwjz":"1.234","jzrq":"2023-10-20"})' });
      }
      if (url.includes('fundf10')) {
        return Promise.resolve({ data: mockHtml });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const result = await getFundHoldings('001234');

    expect(result.name).toBe('Test Fund');
    expect(result.quarterlyHoldings).toHaveLength(2);
    expect(result.quarterlyHoldings?.[0].quarter).toBe('2023-09-30');
    expect(result.quarterlyHoldings?.[0].holdings[0].stockCode).toBe('600519');
    expect(result.quarterlyHoldings?.[0].holdings[0].proportion).toBe(5.12);
    
    expect(result.quarterlyHoldings?.[1].quarter).toBe('2023-06-30');
    expect(result.quarterlyHoldings?.[1].holdings[0].stockCode).toBe('000858');
  });

  it('should handle alternative date format (font tag)', async () => {
     const mockHtml = `var apidata={ content:"<div><font class='px12'>2023-09-30</font><table><tbody><tr><td>1</td><td>600519</td><td>Moutai</td><td>5.12%</td><td>...</td><td>...</td><td>...</td></tr></tbody></table></div>",arryear:2023};`;
     
     mockedAxios.get.mockImplementation((url) => {
        if (url.includes('fundf10')) return Promise.resolve({ data: mockHtml });
        return Promise.resolve({ data: '' });
     });
     
     const result = await getFundHoldings('001234');
     expect(result.quarterlyHoldings).toHaveLength(1);
     expect(result.quarterlyHoldings?.[0].quarter).toBe('2023-09-30');
  });
});
