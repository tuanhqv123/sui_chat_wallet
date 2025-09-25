interface CryptoPriceData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d?: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: string;
}

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
    usd_24h_change: number;
    usd_7d_change?: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
    last_updated_at: number;
  };
}

class CryptoPriceService {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private cache = new Map<string, { data: CryptoPriceData; timestamp: number }>();
  private readonly cacheTimeout = 60000; // 1 minute cache

  // Map of common symbols to CoinGecko IDs
  private readonly symbolToId: Record<string, string> = {
    'SUI': 'sui',
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'FTM': 'fantom',
    'NEAR': 'near',
    'APT': 'aptos',
    'ICP': 'internet-computer',
  };

  /**
   * Get current price for a single cryptocurrency
   */
  public async getPrice(symbol: string): Promise<CryptoPriceData | null> {
    const upperSymbol = symbol.toUpperCase();
    const coinId = this.symbolToId[upperSymbol];

    if (!coinId) {
      console.warn(`Unknown cryptocurrency symbol: ${symbol}`);
      return null;
    }

    // Check cache first
    const cached = this.cache.get(upperSymbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CoinGeckoResponse = await response.json();
      const coinData = data[coinId];

      if (!coinData) {
        return null;
      }

      const priceData: CryptoPriceData = {
        symbol: upperSymbol,
        name: this.getFullName(upperSymbol),
        price: coinData.usd,
        change24h: coinData.usd_24h_change || 0,
        change7d: coinData.usd_7d_change,
        marketCap: coinData.usd_market_cap,
        volume24h: coinData.usd_24h_vol,
        lastUpdated: new Date(coinData.last_updated_at * 1000).toISOString(),
      };

      // Cache the result
      this.cache.set(upperSymbol, {
        data: priceData,
        timestamp: Date.now(),
      });

      return priceData;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple cryptocurrencies
   */
  public async getPrices(symbols: string[]): Promise<CryptoPriceData[]> {
    const upperSymbols = symbols.map(s => s.toUpperCase());
    const coinIds = upperSymbols
      .map(symbol => this.symbolToId[symbol])
      .filter(Boolean);

    if (coinIds.length === 0) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_7d_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CoinGeckoResponse = await response.json();
      const results: CryptoPriceData[] = [];

      for (const [coinId, coinData] of Object.entries(data)) {
        const symbol = this.getSymbolFromId(coinId);
        if (symbol) {
          const priceData: CryptoPriceData = {
            symbol,
            name: this.getFullName(symbol),
            price: coinData.usd,
            change24h: coinData.usd_24h_change || 0,
            change7d: coinData.usd_7d_change,
            marketCap: coinData.usd_market_cap,
            volume24h: coinData.usd_24h_vol,
            lastUpdated: new Date(coinData.last_updated_at * 1000).toISOString(),
          };

          // Cache individual results
          this.cache.set(symbol, {
            data: priceData,
            timestamp: Date.now(),
          });

          results.push(priceData);
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching multiple prices:', error);
      return [];
    }
  }

  /**
   * Get trending cryptocurrencies
   */
  public async getTrendingCoins(): Promise<CryptoPriceData[]> {
    const defaultCoins = ['SUI', 'BTC', 'ETH', 'SOL', 'ADA'];
    return this.getPrices(defaultCoins);
  }

  /**
   * Search for cryptocurrency by name or symbol
   */
  public async searchCrypto(query: string): Promise<Array<{ id: string; symbol: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/search?query=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.coins.slice(0, 10).map((coin: any) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
      }));
    } catch (error) {
      console.error('Error searching crypto:', error);
      return [];
    }
  }

  /**
   * Get historical price data (simplified)
   */
  public async getHistoricalPrice(symbol: string, days: number = 7): Promise<Array<{ date: string; price: number }>> {
    const upperSymbol = symbol.toUpperCase();
    const coinId = this.symbolToId[upperSymbol];

    if (!coinId) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.prices.map(([timestamp, price]: [number, number]) => ({
        date: new Date(timestamp).toISOString().split('T')[0],
        price: price,
      }));
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Format price with appropriate decimals
   */
  public formatPrice(price: number): string {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toFixed(4);
    } else if (price >= 0.01) {
      return price.toFixed(6);
    } else {
      return price.toFixed(8);
    }
  }

  /**
   * Format percentage change with color indication
   */
  public formatChange(change: number): { formatted: string; isPositive: boolean } {
    const isPositive = change >= 0;
    const formatted = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
    return { formatted, isPositive };
  }

  /**
   * Format market cap
   */
  public formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else if (marketCap >= 1e3) {
      return `$${(marketCap / 1e3).toFixed(2)}K`;
    } else {
      return `$${marketCap.toFixed(2)}`;
    }
  }

  /**
   * Clear price cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get symbol from CoinGecko ID
   */
  private getSymbolFromId(coinId: string): string | null {
    for (const [symbol, id] of Object.entries(this.symbolToId)) {
      if (id === coinId) {
        return symbol;
      }
    }
    return null;
  }

  /**
   * Get full name for cryptocurrency
   */
  private getFullName(symbol: string): string {
    const names: Record<string, string> = {
      'SUI': 'Sui',
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SOL': 'Solana',
      'ADA': 'Cardano',
      'AVAX': 'Avalanche',
      'DOT': 'Polkadot',
      'MATIC': 'Polygon',
      'LINK': 'Chainlink',
      'UNI': 'Uniswap',
      'ATOM': 'Cosmos',
      'FTM': 'Fantom',
      'NEAR': 'NEAR Protocol',
      'APT': 'Aptos',
      'ICP': 'Internet Computer',
    };
    return names[symbol] || symbol;
  }

  /**
   * Check if API is available
   */
  public async isApiAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ping`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const cryptoPriceService = new CryptoPriceService();
export type { CryptoPriceData };
