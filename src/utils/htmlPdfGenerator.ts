// --- Helpers ---
const formatCurrency = (amount: number, currency: string = 'CUP'): string => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const formatDate = (dateStr: string): string => {
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
};

const getProductName = (productId: string, products: any[]): string => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown';
};

const getParticipantName = (participantId: string, participants: any[]): string => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.name || 'Unknown';
};

// NEW: Currency Conversion Helper
const convertToCUP = (amount: number, currency: string, rates: any = {}): number => {
    if (!amount) return 0;
    const curr = (currency || 'CUP').toUpperCase();
    if (curr === 'CUP') return amount;

    // Multiply by the conversion rate (default to 1 if missing to prevent NaN errors)
    const rate = rates[curr] || 1;
    return amount * rate;
};

// --- Report Generators ---

export const generateSalesSummaryHtml = (data: any): string => {
    const { sales = [], rates = {} } = data;
    const totalSales = sales.length;

    // Convert all sales to CUP before summing
    const totalRevenueCUP = sales.reduce((sum: number, sale: any) => {
        return sum + convertToCUP(sale.totalAmount, sale.currency, rates);
    }, 0);

    const rows = sales.map((sale: any) => `
        <tr>
            <td>${formatDate(sale.dateSold)}</td>
            <td>${sale.customerPhone || 'Walk-in'}</td>
            <td>${sale.items?.length || 0} items</td>
            <td class="text-right font-bold text-secondary">${formatCurrency(sale.totalAmount, sale.currency)}</td>
        </tr>
    `).join('');

    return `
        <h1>Sales Summary Report</h1>
        <h2>TradeMaster Pro Business Analytics - ${new Date().toLocaleString()}</h2>
        
        <div class="summary-container">
            <div class="summary-card">
                <div>Total Transactions</div>
                <div class="summary-value text-primary">${totalSales}</div>
            </div>
            <div class="summary-card">
                <div>Total Revenue (Converted)</div>
                <div class="summary-value text-secondary">${formatCurrency(totalRevenueCUP, 'CUP')}</div>
            </div>
        </div>

        <h3>Recent Transactions</h3>
        <table>
            <thead><tr><th>Date</th><th>Customer</th><th>Items</th><th class="text-right">Original Total</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

export const generateInventoryHtml = (data: any): string => {
    const { items = [], products = [], rates = {} } = data;

    const totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

    // Convert all inventory values to CUP
    const totalValueCUP = items.reduce((sum: number, item: any) => {
        const itemValue = (item.buyPrice || 0) * (item.quantity || 0);
        return sum + convertToCUP(itemValue, item.currency, rates);
    }, 0);

    const rows = items.map((item: any) => {
        const itemTotalCUP = convertToCUP((item.buyPrice || 0) * (item.quantity || 0), item.currency, rates);
        return `
            <tr>
                <td>${getProductName(item.productId, products)}</td>
                <td>${item.quantity || 0}</td>
                <td class="text-right">${formatCurrency(item.buyPrice || 0, item.currency)}</td>
                <td class="text-right font-bold">${formatCurrency(itemTotalCUP, 'CUP')}</td>
            </tr>
        `;
    }).join('');

    return `
        <h1>Inventory Status Report</h1>
        <h2>TradeMaster Pro Stock Analysis - ${new Date().toLocaleString()}</h2>
        
        <div class="summary-container">
            <div class="summary-card">
                <div>Total Units in Stock</div>
                <div class="summary-value text-primary">${totalItems}</div>
            </div>
            <div class="summary-card">
                <div>Total Inventory Value (Converted)</div>
                <div class="summary-value text-secondary">${formatCurrency(totalValueCUP, 'CUP')}</div>
            </div>
        </div>

        <h3>Current Stock Details</h3>
        <table>
            <thead><tr><th>Product</th><th>Quantity</th><th class="text-right">Unit Price (Orig)</th><th class="text-right">Total Value (CUP)</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

export const generateProfitLossHtml = (data: any): string => {
    const { items = [], sales = [], rates = {} } = data;
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));

    // Convert Revenue and Transport Costs to CUP
    const totalRevenueCUP = sales.reduce((sum: number, sale: any) => sum + convertToCUP(sale.totalAmount, sale.currency, rates), 0);
    const totalTransportCUP = sales.reduce((sum: number, sale: any) => sum + convertToCUP(sale.transportCost, sale.transportCurrency, rates), 0);

    // Convert Cost of Goods Sold to CUP
    let cogSoldCUP = 0;
    sales.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
            const originalItem = itemsMap.get(item.itemId);
            if (originalItem) {
                const cost = (originalItem.buyPrice || 0) * (item.quantity || 0);
                cogSoldCUP += convertToCUP(cost, originalItem.currency, rates);
            }
        });
    });

    const grossProfitCUP = totalRevenueCUP - cogSoldCUP;
    const netProfitCUP = grossProfitCUP - totalTransportCUP;

    return `
        <h1>Profit & Loss Statement</h1>
        <h2>TradeMaster Pro Financial Analysis - ${new Date().toLocaleString()}</h2>
        
        <div class="summary-container">
            <div class="summary-card">
                <div>Total Revenue (CUP)</div>
                <div class="summary-value text-secondary">${formatCurrency(totalRevenueCUP, 'CUP')}</div>
            </div>
            <div class="summary-card">
                <div>Cost of Goods Sold (CUP)</div>
                <div class="summary-value text-danger">${formatCurrency(cogSoldCUP, 'CUP')}</div>
            </div>
            <div class="summary-card">
                <div>Net Profit (CUP)</div>
                <div class="summary-value ${netProfitCUP >= 0 ? 'text-secondary' : 'text-danger'}">${formatCurrency(netProfitCUP, 'CUP')}</div>
            </div>
        </div>

        <h3>Financial Breakdown (Unified in CUP)</h3>
        <table>
            <thead><tr><th>Category</th><th class="text-right">Amount</th></tr></thead>
            <tbody>
                <tr><td><strong>Gross Revenue (Sales)</strong></td><td class="text-right text-secondary">${formatCurrency(totalRevenueCUP, 'CUP')}</td></tr>
                <tr><td>Cost of Goods Sold (Inventory Value)</td><td class="text-right text-danger">- ${formatCurrency(cogSoldCUP, 'CUP')}</td></tr>
                <tr style="background-color: #f0f4f8;"><td><strong>Gross Profit</strong></td><td class="text-right text-primary"><strong>${formatCurrency(grossProfitCUP, 'CUP')}</strong></td></tr>
                <tr><td>Operating Expenses (Transport Costs)</td><td class="text-right text-danger">- ${formatCurrency(totalTransportCUP, 'CUP')}</td></tr>
                <tr style="background-color: #e8f5e9;"><td><strong>Net Profit</strong></td><td class="text-right ${netProfitCUP >= 0 ? 'text-secondary' : 'text-danger'}"><strong>${formatCurrency(netProfitCUP, 'CUP')}</strong></td></tr>
            </tbody>
        </table>
    `;
};

export const generateSalesHistoryHtml = (data: any): string => {
    const { sales = [], items = [], products = [], rates = {} } = data;
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));
    const sortedSales = [...sales].sort((a: any, b: any) => (b.dateSold || '').localeCompare(a.dateSold || ''));

    // Convert total revenue for the summary
    const totalRevenueCUP = sales.reduce((sum: number, sale: any) => sum + convertToCUP(sale.totalAmount, sale.currency, rates), 0);
    const avgSaleCUP = sales.length > 0 ? totalRevenueCUP / sales.length : 0;

    const rows = sortedSales.map((sale: any) => {
        const itemCount = sale.items?.length || 0;
        const firstItem = sale.items?.[0];
        let description = 'No items';
        if (firstItem) {
            const original = itemsMap.get(firstItem.itemId);
            const name = original ? getProductName(original.productId, products) : 'Unknown';
            description = `${name} (${firstItem.quantity})` + (itemCount > 1 ? ` +${itemCount - 1} more` : '');
        }

        const convertedTotal = convertToCUP(sale.totalAmount, sale.currency, rates);

        return `
            <tr>
                <td>${formatDate(sale.dateSold)}</td>
                <td>${sale.customerPhone || 'Walk-in'}</td>
                <td>${description}</td>
                <td class="text-right">
                    <span class="font-bold">${formatCurrency(sale.totalAmount, sale.currency)}</span>
                    <br/>
                    <span style="font-size: 10px; color: #666;">≈ ${formatCurrency(convertedTotal, 'CUP')}</span>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <h1>Sales History Report</h1>
        <h2>TradeMaster Pro Transaction Logs - ${new Date().toLocaleString()}</h2>
        
        <div class="summary-container">
            <div class="summary-card">
                <div>Total Transactions</div>
                <div class="summary-value text-primary">${sales.length}</div>
            </div>
            <div class="summary-card">
                <div>Total Revenue (CUP)</div>
                <div class="summary-value text-secondary">${formatCurrency(totalRevenueCUP, 'CUP')}</div>
            </div>
            <div class="summary-card">
                <div>Average Sale (CUP)</div>
                <div class="summary-value text-accent">${formatCurrency(avgSaleCUP, 'CUP')}</div>
            </div>
        </div>

        <table>
            <thead><tr><th>Date</th><th>Customer</th><th>Items Summary</th><th class="text-right">Total</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

export const generateAdjustmentsHtml = (data: any): string => {
    const { adjustments = [], participants = [], rates = {} } = data;
    const sortedAdjustments = [...adjustments].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const rows = sortedAdjustments.map((adj: any) => {
        const convertedAmount = convertToCUP(adj.amount, adj.currency, rates);

        return `
            <tr>
                <td>${formatDate(adj.date)}</td>
                <td>${getParticipantName(adj.fromParticipantId, participants)}</td>
                <td>${getParticipantName(adj.toParticipantId, participants)}</td>
                <td>${adj.note || '-'}</td>
                <td class="text-right">
                    <span class="font-bold">${formatCurrency(adj.amount, adj.currency)}</span>
                    <br/>
                    <span style="font-size: 10px; color: #666;">≈ ${formatCurrency(convertedAmount, 'CUP')}</span>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <h1>Partner Adjustments Report</h1>
        <h2>TradeMaster Pro Balance Logs - ${new Date().toLocaleString()}</h2>
        <table>
            <thead><tr><th>Date</th><th>From</th><th>To</th><th>Note</th><th class="text-right">Amount</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};