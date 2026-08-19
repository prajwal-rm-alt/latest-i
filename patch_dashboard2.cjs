const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// 1. Add imports
content = content.replace("import { DailyReport, SaleItem, UserProfile } from '../types';", "import { DailyReport, SaleItem, UserProfile, Complaint } from '../types';");
content = content.replace("import { deleteDailyReport, updateDailyReport, saveUser } from '../services/storageService';", "import { deleteDailyReport, updateDailyReport, saveUser, getComplaints } from '../services/storageService';");

// 2. Add state and data fetching
content = content.replace("const [editItemState, setEditItemState] = useState<SaleItem | null>(null);", 
\`const [editItemState, setEditItemState] = useState<SaleItem | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);\`);

content = content.replace("useEffect(() => { getMotivationalQuote(user.apiKey).then(setQuote); }, [user.apiKey]);", 
\`useEffect(() => { 
    getMotivationalQuote(user.apiKey).then(setQuote); 
    getComplaints().then(setComplaints);
  }, [user.apiKey]);\`);

fs.writeFileSync('components/Dashboard.tsx', content);
