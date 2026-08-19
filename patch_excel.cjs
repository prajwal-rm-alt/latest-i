const fs = require('fs');
let content = fs.readFileSync('services/excelExportService.ts', 'utf8');

const startIdx = content.indexOf('export const generateMonthlyExcelReport');
if (startIdx === -1) throw new Error('Not found');

const newCode = `export const generateMonthlyExcelReport = async (user: UserProfile, adjustedData: Record<string, Record<number, number>>, monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const workbook = new ExcelJS.Workbook();

  const createSheet = (brand: 'Bajaj' | 'Morphy Richards', products: any[]) => {
    const sheetName = brand === 'Bajaj' ? 'Bajaj' : 'Morphy Richards';
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: false }]
    });

    ws.columns = [
      { width: 20 },
      { width: 10 },
      { width: 15 },
      { width: 45 },
      { width: 10 },
      ...Array.from({ length: 31 }, () => ({ width: 4 })),
      { width: 12 }
    ];

    const borderStyle = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };

    const row1 = ws.addRow([
      'Store Name & Location',
      user.storeNameAndLocation || user.storeName,
      '',
      'Store Code: ' + (user.storeCode || ''),
      'Target Qty'
    ]);
    row1.height = 25;
    row1.getCell(6).value = brand === 'Bajaj' ? 'Retailer Digital Daily Report' : 'Reliance Digital Daily Report';
    row1.getCell(37).value = 'Remarks';

    const row2 = ws.addRow([
      'Bajaj TL Name',
      user.tlName || '',
      '',
      'Date: ' + monthName
    ]);
    row2.height = 25;

    const headers = ['Category', 'Brand', 'Article Code', 'Description', ''];
    for (let i = 1; i <= 31; i++) headers.push(i.toString());
    headers.push('');
    const row3 = ws.addRow(headers);
    row3.height = 25;

    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 37; c++) {
            ws.getCell(r, c).border = borderStyle;
        }
    }

    ws.mergeCells('B1:C1');
    ws.mergeCells('B2:C2');
    ws.mergeCells('E1:E3');
    ws.mergeCells('F1:AJ2');
    ws.mergeCells('AK1:AK3');

    const setCell = (ref, bold, horiz) => {
        const cell = ws.getCell(ref);
        cell.font = { bold: bold };
        cell.alignment = { vertical: 'middle', horizontal: horiz, wrapText: false };
    };

    setCell('A1', true, 'left');
    setCell('B1', false, 'left');
    setCell('D1', true, 'left');
    setCell('E1', true, 'center');
    ws.getCell('E1').alignment.wrapText = true;
    setCell('F1', true, 'center');
    ws.getCell('F1').font = { bold: true, size: 12 };
    setCell('AK1', true, 'center');

    setCell('A2', true, 'left');
    setCell('B2', false, 'left');
    setCell('D2', true, 'left');

    for (let c = 1; c <= 37; c++) {
        ws.getCell(3, c).font = { bold: true };
        ws.getCell(3, c).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    let currentRow = 4;
    let currentCategory = '';
    let categoryStartRow = 4;

    products.forEach((product, index) => {
      const rowData = [
          product.category,
          brand === 'Bajaj' ? 'Bajaj' : 'Morphy',
          product.rdArticle,
          product.description,
          ''
      ];

      for (let i = 1; i <= 31; i++) {
          if (i <= daysInMonth) {
              const qty = adjustedData[product.description]?.[i] || 0;
              rowData.push(qty > 0 ? qty : '');
          } else {
              rowData.push('');
          }
      }
      rowData.push('');

      const row = ws.addRow(rowData);
      row.height = 20;

      for (let i = 1; i <= 37; i++) {
        const cell = row.getCell(i);
        cell.border = borderStyle;
        if (i === 4) {
           cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
           cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      if (product.category !== currentCategory) {
        if (currentCategory !== '' && currentRow - 1 > categoryStartRow) {
          ws.mergeCells(categoryStartRow, 1, currentRow - 1, 1);
          ws.getCell(categoryStartRow, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }
        currentCategory = product.category;
        categoryStartRow = currentRow;
      }

      if (index === products.length - 1 && currentRow > categoryStartRow) {
        ws.mergeCells(categoryStartRow, 1, currentRow, 1);
        ws.getCell(categoryStartRow, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
      
      currentRow++;
    });
  };

  createSheet('Bajaj', BAJAJ_PRODUCTS);
  createSheet('Morphy Richards', MR_PRODUCTS);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, \`Monthly_Report_\${monthName.replace(' ', '_')}.xlsx\`);
};
`
const finalCode = content.substring(0, startIdx) + newCode;
fs.writeFileSync('services/excelExportService.ts', finalCode);
