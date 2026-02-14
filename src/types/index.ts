export interface Fund {
  code: string;
  name: string;
  type: string;
  nav: number; // 最新净值
  navDate: string; // 净值日期
}

export interface FundHolding {
  stockCode: string;
  stockName: string;
  proportion: number; // 持仓占比
  shares: number; // 持股数量
  nav: number; // 持仓市值（计算得出）
}

export interface QuarterlyHolding {
  quarter: string;
  holdings: FundHolding[];
}

export interface FundHistoryNAV {
  date: string;
  nav: number;
  accNav: number;
  changeRate: string;
}

export interface FundPerformance {
  netWorthTrend: { x: number; y: number; equityReturn: number; unitMoney: string }[];
  acWorthTrend: { x: number; y: number }[];
  grandTotal: { name: string; data: [number, number][] }[]; // Comparison data: [timestamp, value]
}

export interface FundDetail extends Fund {
  holdings: FundHolding[];
  reportDate: string; // 报告日期
  fundScale?: string; // 基金规模
  quarterlyHoldings?: QuarterlyHolding[];
  performance?: FundPerformance;
}

export interface StockRealtime {
  code: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  updateTime: string;
}

export interface UserHolding {
  fundCode: string;
  shares: number; // 持有份额
  cost: number; // 成本单价
  totalCost: number; // 总成本
  currentValue: number; // 当前市值
  profit: number; // 收益
  profitPercent: number; // 收益率
}

export interface FundRealtimeValuation {
  fundCode: string;
  fundName: string;
  nav: number;
  estimatedNav: number;
  estimatedChange: number;
  estimatedChangePercent: number;
  calculationTime: string;
}

export interface UserFund {
  id: string;
  user_id: string;
  fund_code: string;
  fund_name: string;
  shares: number;
  cost: number;
  created_at: string;
  updated_at: string;
}

export interface UserFundWithValue extends UserFund {
  nav: number;
  estimatedNav: number;
  estimatedChange: number;
  estimatedChangePercent: number;
  currentValue: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
}

export interface Position {
  id: string;
  user_id: string;
  fund_code: string;
  fund_name: string;
  sort_order: number;
  shares: number;
  avg_cost: number;
  total_buy: number;
  total_sell: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  fund_id: string;
  fund_code: string;
  fund_name: string;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price: number;
  notes?: string;
  created_at: string;
}

export interface TransactionData {
  fund_id: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  notes?: string;
}
