
import { DailyReport, UserProfile } from "../types";

export const formatToDisplayDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Fix: Passed allSales as a parameter to avoid calling filter on a Promise
export const generateTextReport = (user: UserProfile, report: DailyReport, allSales: DailyReport[]) => {
  
  // Calculate MTD
  const currentMonth = new Date(report.date).getMonth();
  const currentYear = new Date(report.date).getFullYear();
  
  const mtdValue = allSales
    .filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && d <= new Date(report.date);
    })
    .reduce((sum, s) => sum + s.totalValue, 0);

  // Format date DD/MM/YYYY
  const dateStr = formatToDisplayDate(report.date);

  let text = `Name:${user.name}\n`;
  text += `Date: ${dateStr}\n`;
  text += `Store Location :${user.storeName}\n`;
  text += `Today’s Sale Value:= ${report.totalValue.toLocaleString()}\n`;
  text += `Today’s Sale qty=${report.totalQty}\n`;

  // Categorization Logic Helper
  const getQty = (keywords: string[]) => {
      const items = Array.isArray(report.items) ? report.items : [];
      return items.reduce((acc, item) => {
          if (!item) return acc;
          const name = (item.productName || '').toLowerCase();
          const matches = keywords.every(k => name.includes(k.toLowerCase()));
          return matches ? acc + (item.quantity || 0) : acc;
      }, 0);
  };

  // Specific Categories Mapping based on PRODUCT_LIST
  const bajajMixerQty = getQty(['bajaj', 'mixer']) + getQty(['bajaj', 'mg']) + getQty(['bajaj', 'food processor']);
  const morphyMixerQty = getQty(['mr', 'mixer']) + getQty(['mr', 'mg']) + getQty(['mr', 'grind']) + getQty(['mr', 'food processor']);
  const storageGeyserQty = getQty(['storage', 'geyser']) + getQty(['water heater']);
  const instantGeyserQty = getQty(['instant', 'geyser']);
  const mrAirFryerQty = getQty(['air fryer']);
  const mrOtg60Qty = getQty(['otg', '60']);
  const mrOtg29Qty = getQty(['otg', '29']);
  const mrMicrowaveQty = getQty(['microwave']) + getQty(['20mws']); // 20MWS is a model code
  const bajajSteamIronQty = getQty(['bajaj', 'steam', 'iron']);
  const bajajDryIronQty = getQty(['bajaj', 'dry', 'iron']);
  const bajajInductionQty = getQty(['bajaj', 'induction']);
  const bajajSandwichQty = getQty(['bajaj', 'sandwich']);
  const reportItems = Array.isArray(report.items) ? report.items : [];
  const bajajCoolerQty = reportItems.reduce((acc, item) => {
      if (!item) return acc;
      const name = (item.productName || '').toLowerCase();
      const isCooler = name.includes('cooler') || 
                       name.includes('glanza') || 
                       name.includes('elevate') || 
                       name.includes('shield') || 
                       name.includes('mighty') || 
                       name.includes('tmh50');
      return isCooler ? acc + (item.quantity || 0) : acc;
  }, 0);

  // Formatting Function to ensure 2 digits (e.g., 01, 05)
  const fmt = (num: number) => String(num).padStart(2, '0');

  text += `Bajaj Mixer Qty: =${fmt(bajajMixerQty)}\n`;
  text += `Morphy Mixer Qty: =${fmt(morphyMixerQty)}\n`;
  text += `Storage geyser Qty: ${fmt(storageGeyserQty)}\n`;
  text += `Instant geyser Qty: ${fmt(instantGeyserQty)}\n`;
  text += `MR Air fryer=${fmt(mrAirFryerQty)}\n`;
  text += `MR. OTG 60ltr =${fmt(mrOtg60Qty)}\n`;
  text += `MR. OTG 29ltr = ${fmt(mrOtg29Qty)}\n`;
  text += `MR 20MWS = ${fmt(mrMicrowaveQty)}\n`;
  text += `Bajaj  steam  iron =${fmt(bajajSteamIronQty)}\n`;
  text += `Bajaj dry iron=${fmt(bajajDryIronQty)}\n`;
  text += `Bajaj induction${fmt(bajajInductionQty)}\n`;
  text += `Bajaj sandwich maker=${fmt(bajajSandwichQty)}\n`;
  text += `Bajaj cooler=${fmt(bajajCoolerQty)}\n`;
  
  text += `MTD Sale Value = ${mtdValue.toLocaleString()}`;
  return text;
};

export const generateStoreEODReport = (
    user: UserProfile,
    date: string,
    dayTarget: number,
    dayAch: number,
    weekTarget: number,
    weekAch: number,
    eolTarget: number,
    eolAch: number
  ) => {
    // Format date DD/MM/YYYY
    const dateStr = formatToDisplayDate(date);
    
    // Get First Name
    const firstName = user.name.split(' ')[0];

    return `Date: ${dateStr}
Name:${firstName}
Brand:*BAJAJ* 
Day Target:${dayTarget}
Day achievement: ${dayAch}
Week Target : ${weekTarget}
Week achivement : ${weekAch}
Eol  target :${String(eolTarget).padStart(2, '0')}
Eol Achive :${String(eolAch).padStart(2, '0')}`;
  };

export const downloadCSV = (sales: DailyReport[]) => {
    const headers = ['Date', 'Product', 'Quantity', 'Unit Price', 'Total Value'];
    const rows: string[] = [];
    
    (sales || []).forEach(report => {
        (report?.items || []).forEach(item => {
            if (!item) return;
            rows.push([
                report.date || '',
                `"${(item.productName || '').replace(/"/g, '""')}"`, // Escape quotes
                (item.quantity || 0).toString(),
                (item.price || 0).toString(),
                ((item.quantity || 0) * (item.price || 0)).toString()
            ].join(','));
        });
    });

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" + rows.join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
