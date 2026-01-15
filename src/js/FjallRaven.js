/**
 * Fjall Raven Processing Logic
 * Automatically loads FjallRaven_CostBreakdown.csv from assets/data folder
 */

class FjallRavenProcessor {
    constructor() {
        this.fjallRavenCostData = null;
        this.bcbdResults = [];
    }

    /**
     * Initialize - Load Fjall Raven Cost Breakdown CSV automatically
     */
    async initialize() {
        try {
            const response = await fetch('assets/data/FjallRaven_CostBreakdown.csv');
            if (!response.ok) {
                throw new Error('Failed to load FjallRaven_CostBreakdown.csv');
            }

            const csvText = await response.text();
            this.fjallRavenCostData = this.parseCSV(csvText);

            this.displayFjallRavenCostData();

            console.log('Fjall Raven Cost Breakdown loaded:', this.fjallRavenCostData);
        } catch (error) {
            console.error('Error loading Fjall Raven Cost Breakdown:', error);
            this.displayError('Failed to load FjallRaven_CostBreakdown.csv');
        }
    }

    /**
     * Parse CSV text into array of objects
     * Columns: Product, Supplier Material Code, BOM section, Supplier, Labor Cost, Miscellaneous, Qty, First Cost, Price, Freight, Waste
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const data = [];

        lines.forEach(line => {
            const values = line.split(',').map(val => val.trim());

            data.push({
                product: values[0] || '',
                supplierMaterialCode: values[1] || '',
                bomSection: values[2] || '',
                supplier: values[3] || '',
                laborCost: values[4] || '',
                miscellaneous: values[5] || '',
                qty: values[6] || '',
                firstCost: values[7] || '',
                price: values[8] || '',
                freight: values[9] || '',
                waste: values[10] || ''
            });
        });

        return data;
    }

    /**
     * Display Fjall Raven Cost Breakdown data in the OB drop zone
     */
    displayFjallRavenCostData() {
        const obDropZone = document.getElementById('obDropZone-v5');
        if (!obDropZone) return;

        let contentHTML = `
            <div class="burton-cost-container">
                <div class="burton-cost-items">
        `;

        this.fjallRavenCostData.forEach((item, index) => {
            contentHTML += `
                <div class="burton-cost-item">
                    <div class="burton-item-line"><strong>${item.product}</strong></div>
                    <div class="burton-item-line"><strong>Supplier Material Code:</strong> ${item.supplierMaterialCode}</div>
                    <div class="burton-item-line"><strong>BOM Section:</strong> ${item.bomSection}</div>
                    <div class="burton-item-line"><strong>Supplier:</strong> ${item.supplier}</div>
                    <div class="burton-item-line"><strong>Labor Cost:</strong> ${item.laborCost}</div>
                    <div class="burton-item-line"><strong>Miscellaneous:</strong> ${item.miscellaneous}</div>
                    <div class="burton-item-line"><strong>Qty:</strong> ${item.qty}</div>
                    <div class="burton-item-line"><strong>First Cost:</strong> ${item.firstCost}</div>
                    <div class="burton-item-line"><strong>Price:</strong> ${item.price}</div>
                    <div class="burton-item-line"><strong>Freight:</strong> ${item.freight}</div>
                    <div class="burton-item-line"><strong>Waste:</strong> ${item.waste}</div>
                </div>
            `;
        });

        contentHTML += `
                </div>
            </div>
        `;

        obDropZone.innerHTML = contentHTML;
    }

    /**
     * Display error message
     */
    displayError(errorMessage) {
        const obDropZone = document.getElementById('obDropZone-v5');
        if (!obDropZone) return;

        obDropZone.innerHTML = `
            <div class="drop-zone-content">
                <div style="background: #fee; border-left: 4px solid #dc3545; padding: 1.5rem; border-radius: 8px;">
                    <p style="color: #dc3545; font-weight: 600;">${errorMessage}</p>
                </div>
            </div>
        `;
    }

    /**
     * Format a numeric value to 4 decimal places
     */
    formatToFourDecimals(value) {
        if (!value || value === '') return value;
        const cleanValue = value.toString().replace(/[$,\s]/g, '');
        const numValue = parseFloat(cleanValue);
        if (isNaN(numValue)) return value;
        return numValue.toFixed(4);
    }

    /**
     * Process files and generate results
     * TODO: Implement validation logic based on further instructions
     */
    async processFiles(bcbdFiles) {
        this.bcbdResults = [];

        try {
            if (!this.fjallRavenCostData || this.fjallRavenCostData.length === 0) {
                return this.generateErrorHTML('Fjall Raven Cost Breakdown data not loaded');
            }

            if (!bcbdFiles || bcbdFiles.length === 0) {
                return this.generateErrorHTML('Please upload Buyer CBD files');
            }

            // Process each BCBD file
            for (const file of bcbdFiles) {
                const buyerData = await this.parseBuyerCBDFile(file);
                const comparisonResults = this.compareWithOB(buyerData);
                this.bcbdResults.push({
                    fileName: file.name,
                    results: comparisonResults
                });
            }

            return this.generateResultsHTML(this.bcbdResults);

        } catch (error) {
            console.error('Error processing files:', error);
            return this.generateErrorHTML(error.message);
        }
    }

    /**
     * Parse Buyer CBD Excel file
     * TODO: Implement based on further instructions
     */
    async parseBuyerCBDFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    // Get the first sheet
                    const firstSheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                    // TODO: Extract data from specific cells based on further instructions
                    const extractedData = this.extractFjallRavenData(jsonData);
                    resolve(extractedData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extract Fjall Raven data from the Excel file
     * Column mappings:
     * Product - D (index 3)
     * Supplier Material Code - E (index 4)
     * BOM Section - F (index 5)
     * Supplier - G (index 6)
     * Labor Cost - H (index 7)
     * Miscellaneous - J (index 9)
     * Qty - K (index 10)
     * First Cost - L (index 11)
     * Price - M (index 12)
     * Freight - N (index 13)
     * Waste - O (index 14)
     */
    extractFjallRavenData(jsonData) {
        const data = {
            items: [],
            specialItems: [] // For Cost per minute, Minutes/Product, etc.
        };

        // Get the keywords to search for from our CSV
        // Regular items (with product names) - search by Product (Column D)
        const productItems = this.fjallRavenCostData
            .filter(item => item.product && item.product !== '-')
            .map(item => item.product);

        // Special items (product is '-') - search by BOM Section (Column F)
        const specialItems = this.fjallRavenCostData
            .filter(item => item.product === '-')
            .map(item => item.bomSection);

        // Search through all rows for matching products (Column D)
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row[3]) continue; // Column D (Product)

            const cellD = row[3].toString().trim();

            // Check if this cell matches any of our product keywords
            for (const keyword of productItems) {
                if (cellD.toLowerCase().includes(keyword.toLowerCase()) ||
                    keyword.toLowerCase().includes(cellD.toLowerCase())) {

                    const product = cellD;
                    const supplierMaterialCode = row[4] ? row[4].toString().trim() : '';  // Column E
                    const bomSection = row[5] ? row[5].toString().trim() : '';            // Column F
                    const supplier = row[6] ? row[6].toString().trim() : '';              // Column G
                    const laborCost = row[7] ? row[7].toString().trim() : '';             // Column H
                    const miscellaneous = row[9] ? row[9].toString().trim() : '';         // Column J
                    const qty = row[10] ? row[10].toString().trim() : '';                 // Column K
                    const firstCost = row[11] ? row[11].toString().trim() : '';           // Column L
                    const price = row[12] ? row[12].toString().trim() : '';               // Column M
                    const freight = row[13] ? row[13].toString().trim() : '';             // Column N
                    const waste = row[14] ? row[14].toString().trim() : '';               // Column O

                    data.items.push({
                        keyword: keyword,
                        foundText: product,
                        supplierMaterialCode: supplierMaterialCode,
                        bomSection: bomSection,
                        supplier: supplier,
                        laborCost: laborCost,
                        miscellaneous: miscellaneous,
                        qty: qty,
                        firstCost: firstCost,
                        price: price,
                        freight: freight,
                        waste: waste,
                        rowIndex: i,
                        isSpecialItem: false
                    });
                    break; // Found the keyword, move to next row
                }
            }
        }

        // Search through all rows for special items (Column F - BOM Section)
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row[5]) continue; // Column F (BOM Section)

            const cellF = row[5].toString().trim();

            // Check if this cell matches any of our special item keywords
            for (const keyword of specialItems) {
                if (cellF.toLowerCase().includes(keyword.toLowerCase()) ||
                    keyword.toLowerCase().includes(cellF.toLowerCase())) {

                    const laborCost = row[7] ? row[7].toString().trim() : '';             // Column H
                    const miscellaneous = row[9] ? row[9].toString().trim() : '';         // Column J
                    const qty = row[10] ? row[10].toString().trim() : '';                 // Column K
                    const firstCost = row[11] ? row[11].toString().trim() : '';           // Column L
                    const price = row[12] ? row[12].toString().trim() : '';               // Column M
                    const freight = row[13] ? row[13].toString().trim() : '';             // Column N
                    const waste = row[14] ? row[14].toString().trim() : '';               // Column O

                    data.specialItems.push({
                        keyword: keyword,
                        foundText: cellF,
                        laborCost: laborCost,
                        miscellaneous: miscellaneous,
                        qty: qty,
                        firstCost: firstCost,
                        price: price,
                        freight: freight,
                        waste: waste,
                        rowIndex: i,
                        isSpecialItem: true
                    });
                    break; // Found the keyword, move to next row
                }
            }
        }

        console.log('Extracted Fjall Raven data:', data);
        return data;
    }

    /**
     * Compare Buyer CBD data with OB data
     */
    compareWithOB(buyerData) {
        const results = [];

        // First, process special items (Cost per minute, Minutes/Product, etc.)
        for (const csvItem of this.fjallRavenCostData) {
            if (csvItem.product !== '-') continue; // Only process special items here

            // Find matching special item in buyer data by BOM Section
            const buyerItem = buyerData.specialItems.find(
                bi => bi.keyword.toLowerCase() === csvItem.bomSection.toLowerCase()
            );

            if (buyerItem) {
                results.push({
                    itemName: csvItem.bomSection,
                    isSpecialItem: true,
                    supplierMaterialCode: { ob: '-', buyer: '-', status: 'N/A' },
                    bomSection: { ob: '-', buyer: '-', status: 'N/A' },
                    supplier: { ob: '-', buyer: '-', status: 'N/A' },
                    laborCost: {
                        ob: csvItem.laborCost,
                        buyer: buyerItem.laborCost,
                        status: csvItem.laborCost === '-' ? 'N/A' : this.compareNumericField(csvItem.laborCost, buyerItem.laborCost)
                    },
                    miscellaneous: {
                        ob: csvItem.miscellaneous,
                        buyer: buyerItem.miscellaneous,
                        status: csvItem.miscellaneous === '-' ? 'N/A' : this.compareNumericField(csvItem.miscellaneous, buyerItem.miscellaneous)
                    },
                    qty: {
                        ob: csvItem.qty,
                        buyer: buyerItem.qty,
                        status: csvItem.qty === '-' ? 'N/A' : this.compareNumericField(csvItem.qty, buyerItem.qty)
                    },
                    firstCost: {
                        ob: csvItem.firstCost,
                        buyer: buyerItem.firstCost,
                        status: csvItem.firstCost === '-' ? 'N/A' : this.compareNumericField(csvItem.firstCost, buyerItem.firstCost)
                    },
                    price: {
                        ob: csvItem.price,
                        buyer: buyerItem.price,
                        status: csvItem.price === '-' ? 'N/A' : this.compareNumericField(csvItem.price, buyerItem.price)
                    },
                    freight: {
                        ob: csvItem.freight,
                        buyer: buyerItem.freight,
                        status: csvItem.freight === '-' ? 'N/A' : this.compareNumericField(csvItem.freight, buyerItem.freight)
                    },
                    waste: {
                        ob: csvItem.waste,
                        buyer: buyerItem.waste,
                        status: csvItem.waste === '-' ? 'N/A' : this.compareTextField(csvItem.waste, buyerItem.waste)
                    }
                });
            } else {
                // Special item not found in BCBD
                results.push({
                    itemName: csvItem.bomSection,
                    isSpecialItem: true,
                    supplierMaterialCode: { ob: '-', buyer: '-', status: 'N/A' },
                    bomSection: { ob: '-', buyer: '-', status: 'N/A' },
                    supplier: { ob: '-', buyer: '-', status: 'N/A' },
                    laborCost: { ob: csvItem.laborCost, buyer: 'NOT FOUND', status: csvItem.laborCost === '-' ? 'N/A' : 'INVALID' },
                    miscellaneous: { ob: csvItem.miscellaneous, buyer: 'NOT FOUND', status: csvItem.miscellaneous === '-' ? 'N/A' : 'INVALID' },
                    qty: { ob: csvItem.qty, buyer: 'NOT FOUND', status: csvItem.qty === '-' ? 'N/A' : 'INVALID' },
                    firstCost: { ob: csvItem.firstCost, buyer: 'NOT FOUND', status: csvItem.firstCost === '-' ? 'N/A' : 'INVALID' },
                    price: { ob: csvItem.price, buyer: 'NOT FOUND', status: csvItem.price === '-' ? 'N/A' : 'INVALID' },
                    freight: { ob: csvItem.freight, buyer: 'NOT FOUND', status: csvItem.freight === '-' ? 'N/A' : 'INVALID' },
                    waste: { ob: csvItem.waste, buyer: 'NOT FOUND', status: csvItem.waste === '-' ? 'N/A' : 'INVALID' }
                });
            }
        }

        // Then, process regular items
        for (const csvItem of this.fjallRavenCostData) {
            // Skip special items (already processed above)
            if (csvItem.product === '-' || csvItem.product === '') {
                continue;
            }

            // Find matching item in buyer data by keyword
            const buyerItem = buyerData.items.find(
                bi => bi.keyword.toLowerCase() === csvItem.product.toLowerCase()
            );

            if (buyerItem) {
                results.push({
                    itemName: csvItem.product,
                    product: {
                        ob: csvItem.product,
                        buyer: buyerItem.foundText,
                        status: this.compareTextField(csvItem.product, buyerItem.foundText)
                    },
                    supplierMaterialCode: {
                        ob: csvItem.supplierMaterialCode,
                        buyer: buyerItem.supplierMaterialCode,
                        status: this.compareTextField(csvItem.supplierMaterialCode, buyerItem.supplierMaterialCode)
                    },
                    bomSection: {
                        ob: csvItem.bomSection,
                        buyer: buyerItem.bomSection,
                        status: this.compareTextField(csvItem.bomSection, buyerItem.bomSection)
                    },
                    supplier: {
                        ob: csvItem.supplier,
                        buyer: buyerItem.supplier,
                        status: this.compareTextField(csvItem.supplier, buyerItem.supplier)
                    },
                    laborCost: {
                        ob: csvItem.laborCost,
                        buyer: buyerItem.laborCost,
                        status: csvItem.laborCost === '-' ? 'N/A' : this.compareNumericField(csvItem.laborCost, buyerItem.laborCost)
                    },
                    miscellaneous: {
                        ob: csvItem.miscellaneous,
                        buyer: buyerItem.miscellaneous,
                        status: csvItem.miscellaneous === '-' ? 'N/A' : this.compareNumericField(csvItem.miscellaneous, buyerItem.miscellaneous)
                    },
                    qty: {
                        ob: csvItem.qty,
                        buyer: buyerItem.qty,
                        status: csvItem.qty === '-' ? 'N/A' : this.compareNumericField(csvItem.qty, buyerItem.qty)
                    },
                    firstCost: {
                        ob: csvItem.firstCost,
                        buyer: buyerItem.firstCost,
                        status: csvItem.firstCost === '-' ? 'N/A' : this.compareNumericField(csvItem.firstCost, buyerItem.firstCost)
                    },
                    price: {
                        ob: csvItem.price,
                        buyer: buyerItem.price,
                        status: csvItem.price === '-' ? 'N/A' : this.compareNumericField(csvItem.price, buyerItem.price)
                    },
                    freight: {
                        ob: csvItem.freight,
                        buyer: buyerItem.freight,
                        status: csvItem.freight === '-' ? 'N/A' : this.compareNumericField(csvItem.freight, buyerItem.freight)
                    },
                    waste: {
                        ob: csvItem.waste,
                        buyer: buyerItem.waste,
                        status: csvItem.waste === '-' ? 'N/A' : this.compareTextField(csvItem.waste, buyerItem.waste)
                    }
                });
            } else {
                // Item not found in BCBD
                results.push({
                    itemName: csvItem.product,
                    product: { ob: csvItem.product, buyer: 'NOT FOUND', status: 'INVALID' },
                    supplierMaterialCode: { ob: csvItem.supplierMaterialCode, buyer: 'NOT FOUND', status: 'INVALID' },
                    bomSection: { ob: csvItem.bomSection, buyer: 'NOT FOUND', status: 'INVALID' },
                    supplier: { ob: csvItem.supplier, buyer: 'NOT FOUND', status: 'INVALID' },
                    laborCost: { ob: csvItem.laborCost, buyer: 'NOT FOUND', status: csvItem.laborCost === '-' ? 'N/A' : 'INVALID' },
                    miscellaneous: { ob: csvItem.miscellaneous, buyer: 'NOT FOUND', status: csvItem.miscellaneous === '-' ? 'N/A' : 'INVALID' },
                    qty: { ob: csvItem.qty, buyer: 'NOT FOUND', status: csvItem.qty === '-' ? 'N/A' : 'INVALID' },
                    firstCost: { ob: csvItem.firstCost, buyer: 'NOT FOUND', status: csvItem.firstCost === '-' ? 'N/A' : 'INVALID' },
                    price: { ob: csvItem.price, buyer: 'NOT FOUND', status: csvItem.price === '-' ? 'N/A' : 'INVALID' },
                    freight: { ob: csvItem.freight, buyer: 'NOT FOUND', status: csvItem.freight === '-' ? 'N/A' : 'INVALID' },
                    waste: { ob: csvItem.waste, buyer: 'NOT FOUND', status: csvItem.waste === '-' ? 'N/A' : 'INVALID' }
                });
            }
        }

        return results;
    }

    /**
     * Compare text fields (case-insensitive, trimmed)
     */
    compareTextField(obValue, buyerValue) {
        if (!obValue || obValue === '-') return 'N/A';
        if (!buyerValue || buyerValue === 'NOT FOUND') return 'INVALID';

        const obClean = obValue.toString().trim().toLowerCase();
        const buyerClean = buyerValue.toString().trim().toLowerCase();

        // Check if one contains the other (for partial matches)
        if (obClean === buyerClean || obClean.includes(buyerClean) || buyerClean.includes(obClean)) {
            return 'VALID';
        }

        return 'INVALID';
    }

    /**
     * Compare numeric fields
     */
    compareNumericField(obValue, buyerValue) {
        if (!obValue || obValue === '-' || obValue === '') return 'N/A';
        if (!buyerValue || buyerValue === 'NOT FOUND' || buyerValue === '') return 'INVALID';

        // Clean and parse values
        const obClean = obValue.toString().replace(/[$,\s%]/g, '');
        const buyerClean = buyerValue.toString().replace(/[$,\s%]/g, '');

        const obNum = parseFloat(obClean);
        const buyerNum = parseFloat(buyerClean);

        if (isNaN(obNum) || isNaN(buyerNum)) {
            // If not numbers, compare as strings
            return obClean.toLowerCase() === buyerClean.toLowerCase() ? 'VALID' : 'INVALID';
        }

        // Round to 4 decimal places for comparison
        const obRounded = Math.round(obNum * 10000) / 10000;
        const buyerRounded = Math.round(buyerNum * 10000) / 10000;

        return obRounded === buyerRounded ? 'VALID' : 'INVALID';
    }

    /**
     * Generate HTML for results display
     */
    generateResultsHTML(results) {
        if (!results || results.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: #2b4a6c;">
                    <p style="font-size: 1.3em; margin-bottom: 10px;">Fjall Raven Cost Breakdown Loaded</p>
                    <p>Ready for processing. Upload Buyer CBD files to continue.</p>
                </div>
            `;
        }

        let html = '';

        for (const fileResult of results) {
            html += `<div class="file-result-group">`;

            // Count fully valid items (excluding special items from count)
            const regularItems = fileResult.results.filter(r => !r.isSpecialItem);
            const totalItems = regularItems.length;
            const validItems = regularItems.filter(r =>
                r.supplierMaterialCode.status !== 'INVALID' &&
                r.bomSection.status !== 'INVALID' &&
                r.supplier.status !== 'INVALID' &&
                r.qty.status !== 'INVALID' &&
                r.price.status !== 'INVALID' &&
                r.freight.status !== 'INVALID' &&
                r.waste.status !== 'INVALID'
            ).length;

            html += `
                <div class="file-summary-box">
                    <strong>File:</strong> ${fileResult.fileName}<br>
                    <strong>Summary:</strong> ${validItems} out of ${totalItems} items fully match
                </div>
            `;

            // Create comparison table using same CSS classes as Columbia
            html += `
                <table class="results-table">
                    <thead>
                        <tr class="header-labels-row">
                            <th>Item</th>
                            <th>Supplier Mat. Code</th>
                            <th>BOM Section</th>
                            <th>Supplier</th>
                            <th>Labor Cost</th>
                            <th>Misc.</th>
                            <th>Qty</th>
                            <th>First Cost</th>
                            <th>Price</th>
                            <th>Freight</th>
                            <th>Waste</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const item of fileResult.results) {
                // Special items (Cost per minute, etc.) - display with gray background
                if (item.isSpecialItem) {
                    html += `
                        <tr style="border-bottom: 1px solid #e0e8f0; background: #f8f9fa;">
                            <td style="padding: 0.875rem 1rem; color: #6b7280;">-</td>
                            <td style="padding: 0.875rem 1rem; color: #6b7280;">-</td>
                            <td style="padding: 0.875rem 1rem; font-weight: 600; color: #4a5568;">${item.itemName}</td>
                            <td style="padding: 0.875rem 1rem; color: #6b7280;">-</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.laborCost)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.miscellaneous)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.qty)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.firstCost)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.price)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.freight)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.waste)}</td>
                        </tr>
                    `;
                } else {
                    html += `
                        <tr style="border-bottom: 1px solid #e0e8f0;">
                            <td style="padding: 0.875rem 1rem; font-weight: 600;">${item.itemName}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.supplierMaterialCode)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.bomSection)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.supplier)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.laborCost)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.miscellaneous)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.qty)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.firstCost)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.price)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.freight)}</td>
                            <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.waste)}</td>
                        </tr>
                    `;
                }
            }

            html += `
                    </tbody>
                </table>
            </div>`;
        }

        return html;
    }

    /**
     * Format field value with color coding
     */
    formatFieldValue(field) {
        if (!field) return '-';

        // Handle N/A status
        if (field.status === 'N/A') {
            return `<span style="color: #6b7280; font-weight: 500;">-</span>`;
        }

        const isValid = field.status === 'VALID';
        const color = isValid ? '#065f46' : '#991b1b';
        const displayValue = field.buyer || 'Empty';

        if (isValid) {
            return `<span style="color: ${color}; font-weight: 600;">${displayValue}</span>`;
        } else {
            return `<span style="color: ${color}; font-weight: 600;">${displayValue}</span><br><span style="font-size: 0.85em; color: #849bba;">Expected: ${field.ob}</span>`;
        }
    }

    /**
     * Format special item field value (for Cost per minute, etc.)
     * Uses consistent gray color for display, no validation colors
     */
    formatSpecialFieldValue(field) {
        if (!field) return '<span style="color: #6b7280;">-</span>';

        // If N/A or no value, show dash
        if (field.status === 'N/A' || field.ob === '-' || !field.ob) {
            return `<span style="color: #6b7280;">-</span>`;
        }

        // Show the buyer value in gray (info only, not validation)
        const displayValue = field.buyer || '-';
        return `<span style="color: #6b7280;">${displayValue}</span>`;
    }

    /**
     * Generate error HTML
     */
    generateErrorHTML(errorMessage) {
        return `
            <div style="background: #fee; border-left: 4px solid #dc3545; padding: 1.5rem; border-radius: 8px;">
                <p style="color: #dc3545; font-weight: 600; margin-bottom: 0.5rem;">
                    Error Processing Files
                </p>
                <p style="color: #721c24; font-size: 0.95rem;">
                    ${errorMessage}
                </p>
            </div>
        `;
    }
}

// Initialize the processor
window.fjallRavenProcessor = new FjallRavenProcessor();

// Auto-load when V5 tab is activated
document.addEventListener('DOMContentLoaded', () => {
    const v5Tab = document.querySelector('[data-tab="v5"]');
    if (v5Tab) {
        v5Tab.addEventListener('click', () => {
            if (!window.fjallRavenProcessor.fjallRavenCostData) {
                window.fjallRavenProcessor.initialize();
            }
        });
    }

    const v5TabContent = document.getElementById('tab-v5');
    if (v5TabContent && v5TabContent.classList.contains('active')) {
        window.fjallRavenProcessor.initialize();
    }
});
