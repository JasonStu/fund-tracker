/**
 * Text parser for stock information
 */

/**
 * Parsed stock information interface
 */
export interface ParsedStock {
  code: string;           // 股票代码
  name: string;           // 股票名称
  sector: string;         // 相关板块
  priceRange: string;     // 教学入市区间
  strategy: string;       // 操作策略
  pressure: string;       // 第一压力位
  support: string;        // 支撑位
  position: string;       // 仓位
  highlights: string;      // 投资亮点
}

/**
 * Parse stock information from text
 *
 * Input format example:
 * ```
 * 300739    明阳电路
 * 相关板块：PCB元器件
 * 教学入市区间：21.00-21.20元
 * 操作策略：盘中低吸；
 * 第一压力位：22.90元
 * 支撑位：19.80
 * 仓位：10%
 * 投资亮点：公司主营业务为印制电路板(PCB)的研发、生产和销售...
 * ```
 *
 * @param text - Raw text containing stock information
 * @returns ParsedStock object with extracted fields
 */
export function parseStockInfo(text: string): ParsedStock {
  const result: ParsedStock = {
    code: '',
    name: '',
    sector: '',
    priceRange: '',
    strategy: '',
    pressure: '',
    support: '',
    position: '',
    highlights: '',
  };

  if (!text || typeof text !== 'string') {
    return result;
  }

  const lines = text.trim().split('\n').map(line => line.trim()).filter(Boolean);

  if (lines.length === 0) {
    return result;
  }

  // Parse first line: 股票代码 + 股票名称
  const firstLine = lines[0];
  const codeNameMatch = firstLine.match(/^(\d+)\s+/);
  if (codeNameMatch) {
    result.code = codeNameMatch[1];
    // Extract name after code (everything after the number and whitespace)
    result.name = firstLine.replace(codeNameMatch[0], '').trim();
  }

  // Parse remaining lines: 标题: 内容 格式
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Match pattern: "标题: 内容" or "标题：内容" (support both colon types)
    const match = line.match(/^([^：:]+)[：:]\s*(.+)$/);
    if (match) {
      const title = match[1].trim();
      const content = match[2].trim();

      switch (title) {
        case '相关板块':
        case '相关板':
          result.sector = content;
          break;
        case '教学入市区间':
        case '入市区间':
          result.priceRange = content;
          break;
        case '操作策略':
        case '策略':
          result.strategy = content;
          break;
        case '第一压力位':
        case '压力位':
        case '压力':
          result.pressure = content;
          break;
        case '支撑位':
        case '支撑':
          result.support = content;
          break;
        case '仓位':
          result.position = content;
          break;
        case '投资亮点':
        case '亮点':
          result.highlights = content;
          break;
        default:
          // Try to match partial titles
          if (title.includes('板块')) {
            result.sector = content;
          } else if (title.includes('区间') || title.includes('市区')) {
            result.priceRange = content;
          } else if (title.includes('策略')) {
            result.strategy = content;
          } else if (title.includes('压力')) {
            result.pressure = content;
          } else if (title.includes('支撑')) {
            result.support = content;
          } else if (title.includes('仓位')) {
            result.position = content;
          } else if (title.includes('亮点') || title.includes('投资')) {
            result.highlights = content;
          }
      }
    }
  }

  return result;
}

/**
 * Validate parsed stock information
 */
export function validateParsedStock(stock: ParsedStock): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!stock.code) {
    errors.push('股票代码不能为空');
  }
  if (!stock.name) {
    errors.push('股票名称不能为空');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format parsed stock for display
 */
export function formatParsedStockForDisplay(stock: ParsedStock): string {
  return `
股票代码: ${stock.code}
股票名称: ${stock.name}
相关板块: ${stock.sector}
教学入市区间: ${stock.priceRange}
操作策略: ${stock.strategy}
第一压力位: ${stock.pressure}
支撑位: ${stock.support}
仓位: ${stock.position}
投资亮点: ${stock.highlights}
`.trim();
}
