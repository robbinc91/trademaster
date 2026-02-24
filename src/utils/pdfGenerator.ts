import * as pdfMakeModule from 'pdfmake/build/pdfmake';

// 1. Unwrap the Vite module safely
const pdfMake: any = (pdfMakeModule as any).default || pdfMakeModule;

// 2. Define our custom font map
const customFonts = {
    Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf'
    }
};

// 3. Create our own pure Virtual File System dictionary
const myVfs: Record<string, string> = {};

// 4. Helper to fetch fonts directly from your public folder
const fetchFontAsBase64 = async (filename: string): Promise<string> => {
    // --- PRODUCTION: Electron File System ---
    if (window.location.protocol === 'file:' && (window as any).electron) {
        try {
            const electron = (window as any).electron;
            let basePath = decodeURI(window.location.pathname);
            if (basePath.match(/^\/[a-zA-Z]:\//)) basePath = basePath.substring(1);
            const dirPath = electron.path.join(basePath, '..');
            const fontPath = electron.path.join(dirPath, 'fonts', filename);
            return electron.fs.readFileSync(fontPath, 'base64');
        } catch (err) {
            console.error(`File System read failed for ${filename}`, err);
            throw new Error(`Could not read local font: ${filename}`);
        }
    }

    // --- DEVELOPMENT: Web/HTTP Fetch ---
    const response = await fetch(`./fonts/${filename}`);
    if (!response.ok) throw new Error(`Failed to fetch ${filename} from public/fonts/`);

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

// 5. Load the fonts into our custom object
let fontsLoaded = false;
const loadFonts = async () => {
    if (fontsLoaded) return;

    console.log("TradeMaster Pro: Loading fonts to custom dictionary...");
    try {
        myVfs['Roboto-Regular.ttf'] = await fetchFontAsBase64('Roboto-Regular.ttf');
        myVfs['Roboto-Medium.ttf'] = await fetchFontAsBase64('Roboto-Medium.ttf');
        myVfs['Roboto-Italic.ttf'] = await fetchFontAsBase64('Roboto-Italic.ttf');
        myVfs['Roboto-MediumItalic.ttf'] = await fetchFontAsBase64('Roboto-MediumItalic.ttf');

        fontsLoaded = true;
        console.log("TradeMaster Pro: Custom dictionary ready!");
    } catch (error) {
        console.error("Font loading error:", error);
        throw error;
    }
};

// --- Constants & Helpers ---

const COLORS = {
    primary: '#1F4E79',
    secondary: '#2E7D32',
    accent: '#F57C00',
    danger: '#D32F2F',
    dark: '#333333',
    gray: '#666666',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
};

const getProductName = (productId: string, products: any[]): string => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown';
};

const getParticipantName = (participantId: string, participants: any[]): string => {
    const participant = participants.find(p => p.id === participantId);
    return participant?.name || 'Unknown';
};

const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

const formatDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
};

// --- PDF Components ---

const createSummaryCards = (cards: { label: string; value: string; color: string }[]): any => {
    const widths = Array(cards.length).fill('*');
    return {
        table: {
            widths: widths,
            body: [
                cards.map(card => ({ text: card.label, style: 'cardLabel', alignment: 'center' })),
                cards.map(card => ({ text: card.value, style: 'cardValue', alignment: 'center', color: card.color })),
            ],
        },
        layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#E0E0E0',
            vLineColor: () => '#E0E0E0',
            paddingLeft: () => 10,
            paddingRight: () => 10,
            paddingTop: () => 8,
            paddingBottom: () => 8,
        },
        margin: [0, 10, 0, 20],
    };
};

const createTable = (headers: string[], rows: any[][], columnWidths?: string[]): any => {
    const tableBody: any[] = [
        headers.map(h => ({ text: h, style: 'tableHeader', alignment: 'center' })),
        ...rows.map((row, index) => row.map(cell => ({
            text: typeof cell === 'number' ? cell.toLocaleString() : String(cell),
            style: 'tableCell',
            alignment: typeof cell === 'number' ? 'right' : 'left',
            fillColor: index % 2 === 0 ? '#FFFFFF' : '#F9F9F9'
        })))
    ];

    return {
        table: {
            headerRows: 1,
            widths: columnWidths || Array(headers.length).fill('auto'),
            body: tableBody,
        },
        layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#CCCCCC',
            vLineColor: () => '#CCCCCC',
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 6,
            paddingBottom: () => 6,
        },
        margin: [0, 5, 0, 15],
    };
};

const createBaseDoc = (title: string, subtitle: string): any => ({
    pageSize: 'LETTER',
    pageMargins: [50, 60, 50, 60],
    content: [],
    styles: {
        title: { fontSize: 28, bold: true, color: COLORS.primary, alignment: 'center', margin: [0, 0, 0, 10] },
        subtitle: { fontSize: 14, color: COLORS.gray, alignment: 'center', margin: [0, 0, 0, 20] },
        sectionHeader: { fontSize: 14, bold: true, color: COLORS.primary, margin: [0, 15, 0, 10] },
        bodyText: { fontSize: 10, color: COLORS.dark, lineHeight: 1.4 },
        tableHeader: { fontSize: 10, bold: true, color: COLORS.white, fillColor: COLORS.primary },
        tableCell: { fontSize: 9, color: COLORS.dark },
        cardLabel: { fontSize: 9, color: COLORS.gray },
        cardValue: { fontSize: 16, bold: true },
    },
    defaultStyle: { font: 'Roboto' },
    info: { title: title, author: 'TradeMaster Pro', subject: subtitle, creator: 'TradeMaster Pro' },
    header: {
        columns: [
            { text: 'TradeMaster Pro', style: { fontSize: 10, color: COLORS.gray } },
            { text: title, style: { fontSize: 10, color: COLORS.gray }, alignment: 'right' },
        ],
        margin: [50, 20, 50, 0],
    },
    footer: (currentPage: number, pageCount: number) => ({
        text: `Page ${currentPage} of ${pageCount}`,
        style: { fontSize: 9, color: COLORS.gray },
        alignment: 'center',
    }),
});

// --- Safe Generator Failsafe ---

const safeGeneratePdf = async (docDefinition: any): Promise<Blob> => {
    // 1. Wait for our manual fonts to load into myVfs
    await loadFonts();

    // 2. Yield to the browser's event loop so the React "Generating..." spinner visually appears
    await new Promise(resolve => setTimeout(resolve, 50));

    return new Promise((resolve, reject) => {
        try {
            console.log("TradeMaster Pro: Sending explicit fonts to pdfmake...");

            // 3. THE MAGIC FIX: Pass our custom objects directly as arguments 3 and 4!
            // This forces the 0.3.5 engine to use our files and ignore its empty cache.
            const pdfDocGenerator = pdfMake.createPdf(
                docDefinition,
                undefined,     // default table layouts
                customFonts,   // our explicitly defined font map
                myVfs          // our explicitly built base64 dictionary!
            );

            pdfDocGenerator.getBlob((blob: Blob) => {
                console.log("TradeMaster Pro: PDF Generation Success!");
                resolve(blob);
            });
        } catch (err) {
            console.error("PDF Engine Crash:", err);
            reject(err);
        }
    });
};

// --- Report Functions ---

export const generateSalesSummaryReport = async (data: any): Promise<Blob> => {
    const { sales = [], items = [], products = [] } = data;

    const totalSales = sales.length;
    const revenueByCurrency: Record<string, number> = {};

    sales.forEach((sale: any) => {
        const curr = sale.currency || 'USD';
        revenueByCurrency[curr] = (revenueByCurrency[curr] || 0) + (sale.totalAmount || 0);
    });

    const totalItemsSold = sales.reduce((sum: number, sale: any) => sum + sale.items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0), 0);
    const totalTransport = sales.reduce((sum: number, sale: any) => sum + (sale.transportCost || 0), 0);

    const itemsMap = new Map(items.map((i: any) => [i.id, i]));
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};

    sales.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
            const originalItem = itemsMap.get(item.itemId);
            if (originalItem) {
                const productId = originalItem.productId;
                const productName = getProductName(productId, products);
                if (!productSales[productId]) {
                    productSales[productId] = { name: productName, qty: 0, revenue: 0 };
                }
                productSales[productId].qty += item.quantity || 0;
                productSales[productId].revenue += item.subtotal || 0;
            }
        });
    });

    const salesByDate: Record<string, { count: number; revenue: number; currency: string }> = {};
    sales.forEach((sale: any) => {
        const date = sale.dateSold || 'Unknown';
        if (!salesByDate[date]) {
            salesByDate[date] = { count: 0, revenue: 0, currency: sale.currency || 'USD' };
        }
        salesByDate[date].count += 1;
        salesByDate[date].revenue += sale.totalAmount || 0;
    });

    const revenueStr = Object.entries(revenueByCurrency)
        .map(([curr, amt]) => formatCurrency(amt, curr))
        .join(' | ') || '0.00 USD';

    const doc = createBaseDoc('Sales Summary Report', 'Business Analytics');

    doc.content = [
        { text: 'Sales Summary Report', style: 'title' },
        { text: 'TradeMaster Pro Business Analytics', style: 'subtitle' },
        { text: `Generated: ${new Date().toLocaleString()}`, style: { fontSize: 10, color: COLORS.gray, alignment: 'center' }, margin: [0, 0, 0, 30] },

        { text: 'Overview', style: 'sectionHeader' },
        createSummaryCards([
            { label: 'Total Sales', value: String(totalSales), color: COLORS.primary },
            { label: 'Total Revenue', value: revenueStr.split(' | ')[0], color: COLORS.secondary },
            { label: 'Items Sold', value: String(totalItemsSold), color: COLORS.accent },
            { label: 'Transport Fees', value: formatCurrency(totalTransport), color: COLORS.primary },
        ]),

        { text: 'Sales by Date', style: 'sectionHeader' },
        createTable(
            ['Date', 'Sales Count', 'Revenue'],
            Object.entries(salesByDate).sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, d]) => [formatDate(date), d.count, formatCurrency(d.revenue, d.currency)]),
            ['*', 'auto', 'auto']
        ),

        { text: 'Top Products by Sales Volume', style: 'sectionHeader' },
        createTable(
            ['Product', 'Qty Sold', 'Revenue'],
            Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 15)
                .map(p => [p.name, p.qty, formatCurrency(p.revenue)]),
            ['*', 'auto', 'auto']
        ),
    ];

    return safeGeneratePdf(doc);
};

export const generateInventoryReport = async (data: any): Promise<Blob> => {
    const { items = [], products = [] } = data;

    const totalItems = items.length;
    const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const totalValue = items.reduce((sum: number, item: any) => sum + ((item.buyPrice || 0) * (item.quantity || 0)), 0);
    const lowStockItems = items.filter((item: any) => (item.quantity || 0) <= (item.minStock || 5));

    const inventoryByProduct: Record<string, { name: string; quantity: number; value: number; batches: number }> = {};

    items.forEach((item: any) => {
        const productId = item.productId;
        const productName = getProductName(productId, products);

        if (!inventoryByProduct[productId]) {
            inventoryByProduct[productId] = { name: productName, quantity: 0, value: 0, batches: 0 };
        }

        inventoryByProduct[productId].quantity += item.quantity || 0;
        inventoryByProduct[productId].value += (item.buyPrice || 0) * (item.quantity || 0);
        inventoryByProduct[productId].batches += 1;
    });

    const doc = createBaseDoc('Inventory Status Report', 'Stock Analysis');

    doc.content = [
        { text: 'Inventory Status Report', style: 'title' },
        { text: 'TradeMaster Pro Stock Analysis', style: 'subtitle' },
        { text: `Generated: ${new Date().toLocaleString()}`, style: { fontSize: 10, color: COLORS.gray, alignment: 'center' }, margin: [0, 0, 0, 30] },

        { text: 'Overview', style: 'sectionHeader' },
        createSummaryCards([
            { label: 'Total Items', value: String(totalItems), color: COLORS.primary },
            { label: 'Total Units', value: String(totalQuantity), color: COLORS.secondary },
            { label: 'Inventory Value', value: formatCurrency(totalValue), color: COLORS.accent },
            { label: 'Low Stock Alerts', value: String(lowStockItems.length), color: COLORS.danger },
        ]),

        { text: 'Inventory by Product', style: 'sectionHeader' },
        createTable(
            ['Product', 'Total Qty', 'Batches', 'Value'],
            Object.values(inventoryByProduct).sort((a, b) => b.value - a.value)
                .map(p => [p.name, p.quantity, p.batches, formatCurrency(p.value)]),
            ['*', 'auto', 'auto', 'auto']
        ),
    ];

    if (lowStockItems.length > 0) {
        doc.content.push(
            { text: 'Low Stock Alerts', style: 'sectionHeader' },
            createTable(
                ['Product', 'Current Qty', 'Min Stock', 'Status'],
                lowStockItems.map((item: any) => [
                    getProductName(item.productId, products),
                    item.quantity || 0,
                    item.minStock || 5,
                    (item.quantity || 0) === 0 ? 'OUT OF STOCK' : 'LOW STOCK'
                ]),
                ['*', 'auto', 'auto', 'auto']
            )
        );
    }

    return safeGeneratePdf(doc);
};

export const generateProfitLossReport = async (data: any): Promise<Blob> => {
    const { items = [], sales = [], participants = [], products = [] } = data;
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));

    const totalInvestment = items.reduce((sum: number, item: any) => sum + ((item.buyPrice || 0) * (item.initialQuantity || item.quantity || 0)), 0);
    const totalRevenue = sales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
    const totalSalesTransport = sales.reduce((sum: number, sale: any) => sum + (sale.transportCost || 0), 0);

    let cogSold = 0;
    const productStats: Record<string, { name: string; revenue: number; cost: number; qty: number }> = {};

    sales.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
            const originalItem = itemsMap.get(item.itemId);
            if (originalItem) {
                cogSold += (originalItem.buyPrice || 0) * (item.quantity || 0);

                const productId = originalItem.productId;
                const productName = getProductName(productId, products);
                if (!productStats[productId]) {
                    productStats[productId] = { name: productName, revenue: 0, cost: 0, qty: 0 };
                }

                const qty = item.quantity || 0;
                productStats[productId].revenue += item.subtotal || 0;
                productStats[productId].cost += (originalItem.buyPrice || 0) * qty;
                productStats[productId].qty += qty;
            }
        });
    });

    const grossProfit = totalRevenue - cogSold;
    const netProfit = grossProfit - totalSalesTransport;

    const investmentByParticipant: Record<string, { name: string; investment: number; items: number }> = {};
    items.forEach((item: any) => {
        const buyerId = item.buyerId;
        const buyerName = getParticipantName(buyerId, participants);
        const investment = (item.buyPrice || 0) * (item.initialQuantity || item.quantity || 0);

        if (!investmentByParticipant[buyerId]) {
            investmentByParticipant[buyerId] = { name: buyerName, investment: 0, items: 0 };
        }
        investmentByParticipant[buyerId].investment += investment;
        investmentByParticipant[buyerId].items += 1;
    });

    const doc = createBaseDoc('Profit & Loss Report', 'Financial Analysis');
    doc.content = [
        { text: 'Profit & Loss Report', style: 'title' },
        { text: 'TradeMaster Pro Financial Analysis', style: 'subtitle' },
        { text: `Generated: ${new Date().toLocaleString()}`, style: { fontSize: 10, color: COLORS.gray, alignment: 'center' }, margin: [0, 0, 0, 30] },

        { text: 'Financial Overview', style: 'sectionHeader' },
        createSummaryCards([
            { label: 'Total Investment', value: formatCurrency(totalInvestment), color: COLORS.primary },
            { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: COLORS.secondary },
            { label: 'Gross Profit', value: formatCurrency(grossProfit), color: COLORS.accent },
            { label: 'Net Profit', value: formatCurrency(netProfit), color: netProfit >= 0 ? COLORS.secondary : COLORS.danger },
        ]),

        { text: 'Profit Analysis by Product', style: 'sectionHeader' },
        createTable(
            ['Product', 'Qty Sold', 'Revenue', 'Cost', 'Profit', 'Margin'],
            Object.values(productStats).sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost))
                .map(p => {
                    const profit = p.revenue - p.cost;
                    const margin = p.revenue > 0 ? (profit / p.revenue * 100).toFixed(1) : '0.0';
                    return [p.name, p.qty, formatCurrency(p.revenue), formatCurrency(p.cost), formatCurrency(profit), `${margin}%`];
                }),
            ['*', 'auto', 'auto', 'auto', 'auto', 'auto']
        ),

        { text: 'Investment by Participant', style: 'sectionHeader' },
        createTable(
            ['Participant', 'Items', 'Total Investment'],
            Object.values(investmentByParticipant).sort((a, b) => b.investment - a.investment)
                .map(p => [p.name, p.items, formatCurrency(p.investment)]),
            ['*', 'auto', 'auto']
        ),
    ];

    return safeGeneratePdf(doc);
};

export const generateSalesHistoryReport = async (data: any): Promise<Blob> => {
    const { sales = [], items = [], products = [] } = data;
    const itemsMap = new Map(items.map((i: any) => [i.id, i]));

    const sortedSales = [...sales].sort((a, b) => (b.dateSold || '').localeCompare(a.dateSold || ''));
    const totalRevenue = sales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
    const avgSale = sales.length > 0 ? totalRevenue / sales.length : 0;

    const doc = createBaseDoc('Sales History Report', 'Transaction Details');
    const content: any[] = [
        { text: 'Sales History Report', style: 'title' },
        { text: 'TradeMaster Pro Transaction Details', style: 'subtitle' },
        { text: `Generated: ${new Date().toLocaleString()}`, style: { fontSize: 10, color: COLORS.gray, alignment: 'center' }, margin: [0, 0, 0, 30] },

        { text: 'Summary', style: 'sectionHeader' },
        createSummaryCards([
            { label: 'Total Transactions', value: String(sales.length), color: COLORS.primary },
            { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: COLORS.secondary },
            { label: 'Average Sale', value: formatCurrency(avgSale), color: COLORS.accent },
        ]),

        { text: 'Transaction Details', style: 'sectionHeader' },
    ];

    sortedSales.slice(0, 30).forEach((sale: any) => {
        content.push({
            text: `Sale #${(sale.id || '').substring(0, 8)} - ${formatDate(sale.dateSold || '')}`,
            style: { fontSize: 11, bold: true, color: COLORS.dark },
            margin: [0, 10, 0, 5],
        });

        if (sale.customerPhone || sale.address) {
            content.push({
                text: `Customer: ${sale.customerPhone || 'N/A'} | Address: ${sale.address || 'N/A'}`,
                style: { fontSize: 9, color: COLORS.gray },
                margin: [0, 0, 0, 5],
            });
        }

        if (sale.items?.length > 0) {
            content.push(createTable(
                ['Product', 'Qty', 'Unit Price', 'Subtotal'],
                sale.items.map((item: any) => {
                    const originalItem = itemsMap.get(item.itemId);
                    const productName = originalItem ? getProductName(originalItem.productId, products) : 'Unknown';
                    return [
                        productName,
                        item.quantity || 0,
                        formatCurrency(item.pricePerUnit || 0),
                        formatCurrency(item.subtotal || 0)
                    ];
                }),
                ['*', 'auto', 'auto', 'auto']
            ));
        }

        if (sale.transportCost > 0) {
            content.push({
                text: `Transport: ${formatCurrency(sale.transportCost, sale.transportCurrency || 'USD')}`,
                style: { fontSize: 9, color: COLORS.accent },
                margin: [0, 0, 0, 3],
            });
        }

        content.push({
            text: `Total: ${formatCurrency(sale.totalAmount || 0, sale.currency || 'USD')}`,
            style: { fontSize: 10, bold: true, color: COLORS.secondary },
            margin: [0, 0, 0, 10],
        });

        content.push({
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 500, y2: 0, lineWidth: 0.5, lineColor: '#E0E0E0' }],
            margin: [0, 5, 0, 5],
        });
    });

    if (sortedSales.length > 30) {
        content.push({
            text: `... and ${sortedSales.length - 30} more transactions`,
            style: { fontSize: 10, color: COLORS.gray, alignment: 'center' },
            margin: [0, 20],
        });
    }

    doc.content = content;
    return safeGeneratePdf(doc);
};

// Main report generator function
export const generateReport = async (data: any, reportType: string): Promise<Blob> => {
    const generators: Record<string, (data: any) => Promise<Blob>> = {
        sales_summary: generateSalesSummaryReport,
        inventory: generateInventoryReport,
        profit_loss: generateProfitLossReport,
        sales_history: generateSalesHistoryReport,
    };

    const generator = generators[reportType];
    if (!generator) {
        throw new Error(`Unknown report type: ${reportType}`);
    }
    return generator(data);
};