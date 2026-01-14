/**
 * Columbia Processing Logic
 * Automatically loads Columbia_CostBreakdown.csv from assets/data folder
 */

class ColumbiaProcessor {
    constructor() {
        this.columbiaCostData = null;
        this.bcbdResults = [];
    }

    /**
     * Initialize - Load Columbia Cost Breakdown CSV automatically
     */
    async initialize() {
        try {
            // Fetch the Columbia_CostBreakdown.csv file from assets/data folder
            const response = await fetch('assets/data/Columbia_CostBreakdown.csv');
            if (!response.ok) {
                throw new Error('Failed to load Columbia_CostBreakdown.csv');
            }

            const csvText = await response.text();
            this.columbiaCostData = this.parseCSV(csvText);

            // Display the loaded data in the OB drop zone
            this.displayColumbiaCostData();

            console.log('Columbia Cost Breakdown loaded successfully:', this.columbiaCostData);
        } catch (error) {
            console.error('Error loading Columbia Cost Breakdown:', error);
            this.displayError('Failed to load Columbia_CostBreakdown.csv from assets/data folder');
        }
    }

    /**
     * Parse CSV text into array of objects
     * Format: Description, PartNumber, UnitPrice, Quantity, Wastage
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const data = [];

        lines.forEach(line => {
            const values = line.split(',').map(val => val.trim());

            // First line is efficiency
            if (values[0] && values[0].toLowerCase().includes('efficiency')) {
                data.push({
                    description: values[0],
                    efficiency: values[1] || ''
                });
                return;
            }

            // Standard format: Description, PartNumber, UnitPrice, Quantity, Wastage
            data.push({
                description: values[0] || '',
                partNumber: values[1] || '',
                unitPrice: values[2] || '',
                quantity: values[3] || '',
                wastage: values[4] || ''
            });
        });

        return data;
    }

    /**
     * Display Columbia Cost Breakdown data in the OB drop zone
     */
    displayColumbiaCostData() {
        const obDropZone = document.getElementById('obDropZone-v3');
        if (!obDropZone) return;

        let contentHTML = `
            <div class="burton-cost-container">
                <div class="burton-cost-items">
        `;

        // Display each line from the CSV
        this.columbiaCostData.forEach((item, index) => {
            // Handle efficiency line differently
            if (item.efficiency !== undefined) {
                contentHTML += `
                    <div class="burton-cost-item">
                        <div class="burton-item-line"><strong>${item.description}</strong> ${item.efficiency}</div>
                    </div>
                `;
                return;
            }

            contentHTML += `
                <div class="burton-cost-item">
                    <div class="burton-item-line"><strong>${item.description}</strong></div>
                    ${item.partNumber ? `<div class="burton-item-line"><strong>Part #:</strong> ${item.partNumber}</div>` : ''}
                    <div class="burton-item-line"><strong>Unit Price:</strong> ${this.formatToThreeDecimals(item.unitPrice)}</div>
                    <div class="burton-item-line"><strong>Qty:</strong> ${item.quantity}</div>
                    <div class="burton-item-line"><strong>Wastage:</strong> ${this.formatToThreeDecimals(item.wastage)}</div>
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
     * Display error message in the OB drop zone
     */
    displayError(errorMessage) {
        const obDropZone = document.getElementById('obDropZone-v3');
        if (!obDropZone) return;

        obDropZone.innerHTML = `
            <div class="drop-zone-content">
                <div style="background: #fee; border-left: 4px solid #dc3545; padding: 1.5rem; border-radius: 8px;">
                    <p style="color: #dc3545; font-weight: 600; margin-bottom: 0.5rem;">
                        Error Loading File
                    </p>
                    <p style="color: #721c24; font-size: 0.95rem;">
                        ${errorMessage}
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Format a numeric value to 3 decimal places
     */
    formatToThreeDecimals(value) {
        if (!value || value === '') return value;
        const cleanValue = value.toString().replace(/[$,\s]/g, '');
        const numValue = parseFloat(cleanValue);
        if (isNaN(numValue)) return value;
        return numValue.toFixed(3);
    }

    /**
     * Process files and generate results
     */
    async processFiles(bcbdFiles) {
        this.bcbdResults = [];

        try {
            if (!this.columbiaCostData || this.columbiaCostData.length === 0) {
                return this.generateErrorHTML('Columbia Cost Breakdown data not loaded');
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

                    // Extract data from specific cells
                    const extractedData = this.extractColumbiaData(jsonData);
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
     * Extract Columbia data from the Excel file
     * Efficiency% is at cell M19 (column 12, row 18 in 0-indexed)
     * Items are found by searching Column A for keywords:
     * - Material is in Column B (index 1)
     * - FOB Cost is in Column K (index 10)
     * - Factory Usage is in Column O (index 14)
     * - Wastage is in Column Y (index 24)
     */
    extractColumbiaData(jsonData) {
        const data = {
            efficiency: '',
            items: []
        };

        // Efficiency% at M19 (column M = index 12, row 19 = index 18)
        if (jsonData[18] && jsonData[18][12] !== undefined) {
            data.efficiency = jsonData[18][12].toString().trim();
        }

        // Get the item keywords to search for from our CSV (excluding efficiency)
        const itemsToFind = this.columbiaCostData
            .filter(item => item.efficiency === undefined)
            .map(item => item.description);

        // Get unique keywords
        const uniqueKeywords = [...new Set(itemsToFind)];

        // Search through all rows in Column A for matching keywords
        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row[0]) continue;

            const cellA = row[0].toString().trim();

            // Check if this row matches any of our keywords
            for (const keyword of uniqueKeywords) {
                if (cellA.toLowerCase().includes(keyword.toLowerCase())) {
                    // Found a match - extract all relevant columns
                    const material = row[1] ? row[1].toString().trim() : '';           // Column B
                    const fobCost = row[10] ? row[10].toString().trim() : '';           // Column K
                    const factoryUsage = row[14] ? row[14].toString().trim() : '';      // Column O
                    const wastage = row[24] ? row[24].toString().trim() : '';           // Column Y

                    data.items.push({
                        keyword: keyword,
                        foundText: cellA,
                        material: material,
                        fobCost: fobCost,
                        factoryUsage: factoryUsage,
                        wastage: wastage,
                        rowIndex: i
                    });
                }
            }
        }

        console.log('Extracted Columbia data:', data);
        return data;
    }

    /**
     * Compare Buyer CBD data with OB data
     */
    compareWithOB(buyerData) {
        const results = [];

        // Get expected efficiency from CSV (first item with efficiency property)
        const efficiencyItem = this.columbiaCostData.find(item => item.efficiency !== undefined);
        const expectedEfficiency = efficiencyItem ? efficiencyItem.efficiency : '';

        // Compare Efficiency
        const efficiencyStatus = this.compareNumericField(expectedEfficiency, buyerData.efficiency);
        results.push({
            itemName: 'Efficiency%',
            obMaterial: expectedEfficiency,
            buyerMaterial: buyerData.efficiency,
            materialStatus: efficiencyStatus,
            obFobCost: '-',
            buyerFobCost: '-',
            fobCostStatus: 'VALID',
            obFactoryUsage: '-',
            buyerFactoryUsage: '-',
            factoryUsageStatus: 'VALID',
            obWastage: '-',
            buyerWastage: '-',
            wastageStatus: 'VALID'
        });

        // Get all non-efficiency items from CSV
        const csvItems = this.columbiaCostData.filter(item => item.efficiency === undefined);

        // Compare each CSV item with found items in BCBD
        for (const csvItem of csvItems) {
            // Find matching item in buyer data by keyword
            const buyerItem = buyerData.items.find(
                bi => bi.keyword.toLowerCase() === csvItem.description.toLowerCase() &&
                      bi.material === csvItem.partNumber
            );

            if (buyerItem) {
                // Found exact match - compare all fields
                results.push({
                    itemName: csvItem.description,
                    obMaterial: csvItem.partNumber,
                    buyerMaterial: buyerItem.material,
                    materialStatus: csvItem.partNumber === buyerItem.material ? 'VALID' : 'INVALID',
                    obFobCost: csvItem.unitPrice,
                    buyerFobCost: buyerItem.fobCost,
                    fobCostStatus: this.compareNumericField(csvItem.unitPrice, buyerItem.fobCost),
                    obFactoryUsage: csvItem.quantity,
                    buyerFactoryUsage: buyerItem.factoryUsage,
                    factoryUsageStatus: this.compareNumericField(csvItem.quantity, buyerItem.factoryUsage),
                    obWastage: csvItem.wastage,
                    buyerWastage: buyerItem.wastage,
                    wastageStatus: this.compareNumericField(csvItem.wastage, buyerItem.wastage)
                });
            } else {
                // Check if keyword exists with any material
                const keywordMatch = buyerData.items.find(
                    bi => bi.keyword.toLowerCase() === csvItem.description.toLowerCase()
                );

                if (keywordMatch) {
                    // Keyword found but material doesn't match
                    results.push({
                        itemName: csvItem.description,
                        obMaterial: csvItem.partNumber,
                        buyerMaterial: keywordMatch.material,
                        materialStatus: 'INVALID',
                        obFobCost: csvItem.unitPrice,
                        buyerFobCost: keywordMatch.fobCost,
                        fobCostStatus: this.compareNumericField(csvItem.unitPrice, keywordMatch.fobCost),
                        obFactoryUsage: csvItem.quantity,
                        buyerFactoryUsage: keywordMatch.factoryUsage,
                        factoryUsageStatus: this.compareNumericField(csvItem.quantity, keywordMatch.factoryUsage),
                        obWastage: csvItem.wastage,
                        buyerWastage: keywordMatch.wastage,
                        wastageStatus: this.compareNumericField(csvItem.wastage, keywordMatch.wastage)
                    });
                } else {
                    // Keyword not found at all
                    results.push({
                        itemName: csvItem.description,
                        obMaterial: csvItem.partNumber,
                        buyerMaterial: 'NOT FOUND',
                        materialStatus: 'INVALID',
                        obFobCost: csvItem.unitPrice,
                        buyerFobCost: 'NOT FOUND',
                        fobCostStatus: 'INVALID',
                        obFactoryUsage: csvItem.quantity,
                        buyerFactoryUsage: 'NOT FOUND',
                        factoryUsageStatus: 'INVALID',
                        obWastage: csvItem.wastage,
                        buyerWastage: 'NOT FOUND',
                        wastageStatus: 'INVALID'
                    });
                }
            }
        }

        return results;
    }

    /**
     * Compare numeric fields
     */
    compareNumericField(obValue, buyerValue) {
        const cleanOB = (obValue || '').toString().replace(/[$,\s%]/g, '');
        const cleanBuyer = (buyerValue || '').toString().replace(/[$,\s%]/g, '');

        const obNum = parseFloat(cleanOB);
        const buyerNum = parseFloat(cleanBuyer);

        if (isNaN(obNum) || isNaN(buyerNum)) {
            return 'INVALID';
        }

        // Round both values to 2 decimal places for comparison
        const obRounded = parseFloat(obNum.toFixed(2));
        const buyerRounded = parseFloat(buyerNum.toFixed(2));

        if (obRounded === buyerRounded) {
            return 'VALID';
        }

        return 'INVALID';
    }

    /**
     * Format field value with color coding
     */
    formatFieldValue(obValue, buyerValue, status) {
        const isValid = status === 'VALID';
        const color = isValid ? '#065f46' : '#991b1b';
        const displayValue = buyerValue || 'Empty';

        if (isValid) {
            return `<span style="color: ${color}; font-weight: 600;">${displayValue}</span>`;
        } else {
            return `<span style="color: ${color}; font-weight: 600;">${displayValue}</span><br><span style="font-size: 0.85em; color: #849bba;">Expected: ${obValue}</span>`;
        }
    }

    /**
     * Generate HTML for results display
     */
    generateResultsHTML(results) {
        if (!results || results.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: #2b4a6c;">
                    <p style="font-size: 1.3em; margin-bottom: 10px;">Columbia Cost Breakdown Loaded</p>
                    <p>Ready for processing. Upload Buyer CBD files to continue.</p>
                </div>
            `;
        }

        let html = '';

        for (const fileResult of results) {
            html += `<div class="file-result-group">`;

            // Count fully valid items (all fields match)
            const totalItems = fileResult.results.length;
            const validItems = fileResult.results.filter(r =>
                r.materialStatus === 'VALID' &&
                r.fobCostStatus === 'VALID' &&
                r.factoryUsageStatus === 'VALID' &&
                r.wastageStatus === 'VALID'
            ).length;

            html += `
                <div class="file-summary-box">
                    <strong>File:</strong> ${fileResult.fileName}<br>
                    <strong>Summary:</strong> ${validItems} out of ${totalItems} items fully match
                </div>
            `;

            // Create comparison table
            html += `
                <table class="results-table">
                    <thead>
                        <tr class="header-labels-row">
                            <th>Item</th>
                            <th>Material</th>
                            <th>FOB Cost</th>
                            <th>Factory Usage</th>
                            <th>Wastage</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const item of fileResult.results) {
                // Check if any field is invalid for row background
                const hasInvalid = item.materialStatus !== 'VALID' ||
                                   item.fobCostStatus !== 'VALID' ||
                                   item.factoryUsageStatus !== 'VALID' ||
                                   item.wastageStatus !== 'VALID';
                const rowBg = hasInvalid ? 'background-color: #fef2f2;' : '';

                html += `
                    <tr style="border-bottom: 1px solid #e0e8f0; ${rowBg}">
                        <td style="padding: 0.875rem 1rem; font-weight: 600;">${item.itemName}</td>
                        <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.obMaterial, item.buyerMaterial, item.materialStatus)}</td>
                        <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.obFobCost, item.buyerFobCost, item.fobCostStatus)}</td>
                        <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.obFactoryUsage, item.buyerFactoryUsage, item.factoryUsageStatus)}</td>
                        <td style="padding: 0.875rem 1rem;">${this.formatFieldValue(item.obWastage, item.buyerWastage, item.wastageStatus)}</td>
                    </tr>
                `;
            }

            html += `
                    </tbody>
                </table>
            </div>`;
        }

        return html;
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
window.columbiaProcessor = new ColumbiaProcessor();

// Auto-load Columbia Cost Breakdown when V3 tab is activated
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on V3 tab and initialize
    const v3Tab = document.querySelector('[data-tab="v3"]');
    if (v3Tab) {
        v3Tab.addEventListener('click', () => {
            if (!window.columbiaProcessor.columbiaCostData) {
                window.columbiaProcessor.initialize();
            }
        });
    }

    // If V3 tab is already active on load, initialize immediately
    const v3TabContent = document.getElementById('tab-v3');
    if (v3TabContent && v3TabContent.classList.contains('active')) {
        window.columbiaProcessor.initialize();
    }
});
