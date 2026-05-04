// ==================== DATA STRUCTURES ====================
let users = [];
let currentUser = null;
let currentModule = 'finishGood';
let mainCategories = [];
let subCategories = [];
let items = [];
let customers = [];
let customerProvinces = [];
let customerDistricts = [];
let transactions = [];
let orders = [];
let rawMaterials = []; // Legacy
let rmMainCategories = [];
let rmSubCategories = [];
let rmItems = [];
let rmUnits = [];
let rmFormulas = [];
let rmFormulaItems = [];
let storeItems = [];
let storeMainCategories = [];
let storeSubCategories = [];
let storeTransactions = [];
let storeExpandedIds = new Set();
let rmTransactions = [];
let rmConsumptionLogs = [];
let rmExpandedIds = new Set();
let storeMasterLists = { issued_to: [], issued_by: [], purpose: [] };
let archivedReports = []; // Global list of archived report metadata
let rmPhysicalStockMap = JSON.parse(localStorage.getItem('rmPhysicalStockMap') || '{}'); // Persist between refreshes

let auditSession = {}; // Correctly initialized global session
let auditRecords = [];
let systemDateFormat = 'DD-MM-YYYY'; // Default format

// Company Settings
let companySettings = {
    name: 'StockFlow',
    logo: '📦',
    availableLengths: [10, 13, 20] // Default values
};

// Initialize App
async function initApp() {
    console.log('StockFlow: Initializing App...');
    // Load local session if any
    let savedUser = localStorage.getItem('stock_currentUser');
    if (savedUser) {
        try { currentUser = JSON.parse(savedUser); } catch (e) { }
    }

    let savedAudit = localStorage.getItem('stock_auditSession');
    if (savedAudit) {
        try { auditSession = JSON.parse(savedAudit); } catch (e) { }
    }

    // Fetch all data from SQL with cache buster
    const cacheBuster = Date.now();
    try {
        const response = await fetch(`api/sync.php?action=get_all&v=${cacheBuster}`);
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error('Invalid JSON from server:', text);
            throw new Error('Server returned invalid data format.');
        }
        
        if (result.status === 'success') {
            console.log('StockFlow: SQL Data loaded successfully.', result.data);
            const d = result.data;
            users = d.users || [];
            mainCategories = d.mainCategories || [];
            subCategories = d.subCategories || [];
            items = d.items || [];
            customers = d.customers || [];
            customerProvinces = d.customerProvinces || [];
            customerDistricts = d.customerDistricts || [];
            orders = d.orders || [];
            transactions = d.transactions || [];
            rawMaterials = d.rawMaterials || []; // Legacy
            rmMainCategories = d.rmMainCategories || [];
            rmSubCategories = d.rmSubCategories || [];
            rmItems = d.rmItems || [];
            rmUnits = d.rmUnits || [];
            rmFormulas = d.rmFormulas || [];
            rmFormulaItems = d.rmFormulaItems || [];
            storeItems = d.storeItems || [];
            storeMainCategories = d.storeMainCategories || [];
            storeSubCategories = d.storeSubCategories || [];
            storeTransactions = d.storeTransactions || [];
            rmTransactions = d.rmTransactions || [];
            archivedReports = d.archivedReports || [];
            rmConsumptionLogs = d.rmConsumptionLogs || [];
            
            // Extract Store Master Lists from settings
            const sLists = d.settings.filter(s => s.category === 'store_lists');
            storeMasterLists = { issued_to: [], issued_by: [], purpose: [] };
            sLists.forEach(s => {
                if (storeMasterLists[s.key]) {
                    try { storeMasterLists[s.key] = JSON.parse(s.value); } catch(e) { }
                }
            });
            // Defaults if empty
            if (storeMasterLists.issued_to.length === 0) storeMasterLists.issued_to = ['Factory Floor', 'Warehouse A', 'Maintenance Dept', 'Main Office'];
            if (storeMasterLists.issued_by.length === 0) storeMasterLists.issued_by = ['Admin', 'Store Manager', 'Shift Supervisor'];
            if (storeMasterLists.purpose.length === 0) storeMasterLists.purpose = ['Production', 'Repair & Maintenance', 'Sampling', 'Gift', 'Internal Use'];
            
            // Sync Audit Session from DB: restore saved counts if they are not currently being edited
            if (d.latestAudit) {
                d.latestAudit.forEach(a => {
                    if (!(a.item_id in auditSession) || !auditSession[a.item_id]) {
                        auditSession[a.item_id] = String(a.godown_qty);
                    }
                });
                localStorage.setItem('stock_auditSession', JSON.stringify(auditSession));
            }
            
            // Map settings
            if (d.settings) {
                d.settings.forEach(s => {
                    if (s.category === 'company') {
                        if (s.key === 'availableLengths') {
                            try { companySettings.availableLengths = JSON.parse(s.value); } catch(e) { }
                        } else {
                            companySettings[s.key] = s.value;
                        }
                    } else if (s.category === 'system') {
                        if (s.key === 'date_format') {
                            systemDateFormat = s.value;
                            window.systemDateFormat = s.value;
                        }
                    }
                });
            }
            updateLengthDropdowns();
            const dateSelect = document.getElementById('systemDateFormat');
            if (dateSelect) dateSelect.value = systemDateFormat;
            window.systemDateFormat = systemDateFormat;

            // Post-process transactions to match UI expectations
            transactions.forEach(t => {
                if (!t.productCode && t.itemId) {
                    let item = items.find(i => i.id == t.itemId);
                    let sub = subCategories.find(s => s.id == (item ? item.subId : t.subId));
                    let main = mainCategories.find(m => m.id == (item ? item.mainId : t.mainId));
                    if (item && sub && main) {
                        t.productCode = getProductCode(item, main, sub);
                        t.mainName = main.name;
                    }
                }
            });

            // Post-process orders to hydrate items and codes with fail-safety
            orders.forEach(o => {
                try {
                    let customer = customers.find(c => c.id == o.customerId);
                    o.customerName = customer ? `${customer.name} (${customer.uniqueId})` : `Unknown Customer (ID:${o.customerId})`;

                    (o.items || []).forEach(item => {
                        let masterItem = items.find(i => i.id == item.itemId);
                        if (masterItem) {
                            let sub = subCategories.find(s => s.id == masterItem.subId);
                            let main = mainCategories.find(m => m.id == masterItem.mainId);
                            if (sub && main) {
                                item.mainId = masterItem.mainId;
                                item.subId = masterItem.subId;
                                item.mainName = main.name;
                                item.subName = sub.name;
                                item.productCode = getProductCode(masterItem, main, sub);
                                item.itemName = masterItem.name;
                                item.weight = masterItem.weight;
                            }
                        }
                        // Ensure required display fields exist even if master record is missing
                        item.productCode = item.productCode || 'Deleted Item';
                        item.itemName = item.itemName || '';
                    });
                } catch (err) {
                    console.warn('StockFlow: Non-fatal error hydrating order:', o.id, err);
                }
            });

            saveData(); // Sync to local backup
            updateOrderFilterCounts();
        } else {
            console.warn('StockFlow: SQL returned error state:', result.message);
            loadLegacyData();
        }
    } catch (e) {
        console.error('StockFlow: Init failed, using legacy data.', e);
        loadLegacyData();
    }

    updateCompanyDisplay();
    if (!currentUser) {
        showLogin();
    } else {
        hideLogin();
        // Force refresh all UI components with new SQL data
        refreshDashboard();
        refreshCategoriesView();
        refreshStockList();
        refreshOrdersList();
        refreshCustomersList();
        refreshTransactions();
        refreshUsersList();
        refreshLowStockReport();
        refreshAuditList();
        refreshArchivedReportsList();
        
        // Raw Material Refreshes
        refreshRMInventory();
        refreshRMDashboard();
        refreshRMFormulas();
        refreshRMInFormControls();
        refreshRMOutFormControls();
        refreshRMInventoryBalance();
        populateRMHistoryYearFilter();
        enforceGlobalPermissions();
        refreshRMConsumptionReport();
    }
}

function showTab(tabName) {
    if (currentModule === 'settings') return;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    
    let tab = document.getElementById(tabName);
    if (tab) tab.classList.add('active');
    
    // Set active button
    document.querySelectorAll('.nav-tab').forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(`'${tabName}'`)) btn.classList.add('active');
    });

    if (tabName === 'dashboard') refreshDashboard();
    if (tabName === 'orders') refreshOrdersList();
    if (tabName === 'dataEntry') refreshTransactions();
    if (tabName === 'categories') refreshCategoriesView();
    if (tabName === 'stockList') refreshStockList();
    if (tabName === 'customers') refreshCustomersList();
    if (tabName === 'transactions') refreshTransactions();
    if (tabName === 'users') refreshUsersList();
    if (tabName === 'lowStockReport') refreshLowStockReport();
    if (tabName === 'audit') refreshAuditList();
    if (tabName === 'reports') refreshArchivedReportsList();
    
    // Crucially enforce permissions after tab change
    enforceGlobalPermissions();

    // Raw Material refreshers
    if (tabName.startsWith('rm_')) {
        if (tabName === 'rm_dashboard') if (typeof refreshRMDashboard === 'function') refreshRMDashboard();
        if (tabName === 'rm_in') if (typeof refreshRMTransactions === 'function') refreshRMTransactions('IN');
        if (tabName === 'rm_out') if (typeof refreshRMTransactions === 'function') refreshRMTransactions('OUT');
        if (tabName === 'rm_formulas') if (typeof refreshRMFormulas === 'function') refreshRMFormulas();
        if (tabName === 'rm_inventory') {
            if (typeof rmExpandedIds !== 'undefined') rmExpandedIds.clear();
            if (typeof refreshRMInventory === 'function') refreshRMInventory();
        }
        if (tabName === 'rm_balance') if (typeof refreshRMInventoryBalance === 'function') refreshRMInventoryBalance();
        if (tabName === 'rm_audit') if (typeof refreshRMAudit === 'function') refreshRMAudit();
        if (tabName === 'rm_reports') if (typeof refreshArchivedReportsList === 'function') refreshArchivedReportsList();
        if (tabName === 'rm_consumption') if (typeof refreshRMConsumptionReport === 'function') refreshRMConsumptionReport();
    }

    // Store refreshers
    if (tabName.startsWith('store_')) {
        if (tabName === 'store_dashboard') if (typeof refreshStoreDashboard === 'function') refreshStoreDashboard();
        if (tabName === 'store_inwards') if (typeof refreshStoreInwards === 'function') refreshStoreInwards();
        if (tabName === 'store_outwards') if (typeof refreshStoreOutwards === 'function') refreshStoreOutwards();
        if (tabName === 'store_inventory') if (typeof refreshStoreInventory === 'function') refreshStoreInventory();
        if (tabName === 'store_items') if (typeof refreshStoreItems === 'function') refreshStoreItems();
        if (tabName === 'store_audit') if (typeof refreshStoreAudit === 'function') refreshStoreAudit();
        if (tabName === 'store_reports') if (typeof refreshStoreReports === 'function') refreshStoreReports();
    }
    enforceGlobalPermissions();
}


function loadLocalData() {
    try {
        let savedOrders = localStorage.getItem('stock_orders');
        if (savedOrders) orders = JSON.parse(savedOrders);
        let savedCustomers = localStorage.getItem('stock_customers');
        if (savedCustomers) customers = JSON.parse(savedCustomers);
        let savedTransactions = localStorage.getItem('stock_transactions');
        if (savedTransactions) transactions = JSON.parse(savedTransactions);
        let savedItems = localStorage.getItem('stock_items');
        if (savedItems) items = JSON.parse(savedItems);
        let savedMainCat = localStorage.getItem('stock_mainCat');
        if (savedMainCat) mainCategories = JSON.parse(savedMainCat);
        let savedSubCat = localStorage.getItem('stock_subCat');
        if (savedSubCat) subCategories = JSON.parse(savedSubCat);
        let savedRM = localStorage.getItem('stock_rawMaterials');
        if (savedRM) rawMaterials = JSON.parse(savedRM);
        let savedStore = localStorage.getItem('stock_storeItems');
        if (savedStore) storeItems = JSON.parse(savedStore);
        let savedRMTrans = localStorage.getItem('stock_rmTransactions');
        if (savedRMTrans) rmTransactions = JSON.parse(savedRMTrans);
        let savedCompany = localStorage.getItem('stock_company');
        if (savedCompany) companySettings = JSON.parse(savedCompany);
        let savedUsers = localStorage.getItem('stock_users');
        if (savedUsers) users = JSON.parse(savedUsers);
        
        let savedUsedOrders = localStorage.getItem('stock_usedOrders');
        if (savedUsedOrders) {
            try {
                usedCompletedOrders = new Set(JSON.parse(savedUsedOrders));
            } catch (e) { }
        }
    } catch (e) { console.warn('StockFlow: Error loading local data', e); }
}

function loadLegacyData() { loadLocalData(); } // For backward compatibility in catch blocks

function saveData() {
    localStorage.setItem('stock_orders', JSON.stringify(orders || []));
    localStorage.setItem('stock_customers', JSON.stringify(customers || []));
    localStorage.setItem('stock_transactions', JSON.stringify(transactions || []));
    localStorage.setItem('stock_items', JSON.stringify(items || []));
    localStorage.setItem('stock_mainCat', JSON.stringify(mainCategories || []));
    localStorage.setItem('stock_subCat', JSON.stringify(subCategories || []));
    localStorage.setItem('stock_rawMaterials', JSON.stringify(rawMaterials || []));
    localStorage.setItem('stock_storeItems', JSON.stringify(storeItems || []));
    localStorage.setItem('stock_rmTransactions', JSON.stringify(rmTransactions || []));
    localStorage.setItem('stock_usedOrders', JSON.stringify(Array.from(usedCompletedOrders || [])));
    localStorage.setItem('stock_company', JSON.stringify(companySettings));
    localStorage.setItem('stock_users', JSON.stringify(users || []));
    if (currentUser) {
        localStorage.setItem('stock_currentUser', JSON.stringify(currentUser));
    }
}

function saveAll() {
    saveData();
}

// Call init on load
window.addEventListener('DOMContentLoaded', initApp);

// Auto-sync every 60 seconds to ensure life data across devices
setInterval(() => {
    if (currentUser) {
        console.log('StockFlow: Auto-syncing data...');
        initApp(); 
    }
}, 60000);

function updateCompanyDisplay() {
    document.title = `${companySettings.name} - Stock Manager`;
    document.getElementById('sidebarCompany').textContent = companySettings.name;
    document.getElementById('sidebarLogo').innerHTML = companySettings.logo || '📦';
    
    // Update Login Page if it exists
    const loginTitle = document.getElementById('loginTitle');
    if (loginTitle) {
        loginTitle.innerHTML = `${companySettings.logo || '📦'} ${companySettings.name}`;
    }

    // Update Settings Page inputs
    const nameInput = document.getElementById('companyNameInput');
    if (nameInput) nameInput.value = companySettings.name;
    
    const logoPreview = document.getElementById('logoPreview');
    if (logoPreview) logoPreview.innerHTML = companySettings.logo || '📦';

    // Update Print Headers
    const logoElements = document.querySelectorAll('.printLogo, #printLogo, #auditPrintLogo');
    logoElements.forEach(el => el.innerHTML = companySettings.logo || '📦');

    const nameElements = document.querySelectorAll('.printCompanyName, #printCompanyName, #auditPrintCompanyName');
    nameElements.forEach(el => el.textContent = companySettings.name);
}

function showCompanySettings() {
    switchModule('settings');
    setTimeout(() => {
        document.getElementById('companyNameInput').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function saveCompanySettings() {
    companySettings.name = document.getElementById('companyNameInput').value || 'StockFlow';
    fetch('api/sync.php?action=save_settings', {
        method: 'POST',
        body: JSON.stringify({ settings: { name: companySettings.name, logo: companySettings.logo } })
    });
    localStorage.setItem('stock_company', JSON.stringify(companySettings));
    updateCompanyDisplay();
    alert('Company settings saved!');
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            companySettings.logo = `<img src="${e.target.result}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            fetch('api/sync.php?action=save_settings', {
                method: 'POST',
                body: JSON.stringify({ settings: { name: companySettings.name, logo: companySettings.logo } })
            });
            localStorage.setItem('stock_company', JSON.stringify(companySettings));
            updateCompanyDisplay();
        };
        reader.readAsDataURL(file);
    }
}




// Function to re-sequence all codes to fill gaps and maintain order
function resequenceCodes() {
    console.log('StockFlow: Resequencing codes...');
    // Sort main categories to have a consistent base
    sortMainCategories(mainCategories).forEach((main) => {
        let mainCode = main.code || '00';

        // Resequence SubCategories (Sizes) within this Brand
        let brandSubs = subCategories.filter(s => s.mainId === main.id);
        sortSubCategories(brandSubs).forEach((sub, subIndex) => {
            let newSubSeq = subIndex + 1;
            // Use 3-digit padding for sub-categories (sizes)
            sub.code = mainCode + String(newSubSeq).padStart(3, '0');

            // Resequence Items within this Size
            let subItems = items.filter(i => i.subId === sub.id);
            sortItems(subItems).forEach((item, itemIndex) => {
                let newItemSeq = itemIndex + 1;
                // Use 4-digit padding for items
                item.code = sub.code + String(newItemSeq).padStart(4, '0');
            });
        });
    });
}

function getProductCode(item, main, sub) {
    if (!item || !main || !sub) return 'N/A';
    let size = sub.name.replace(/[^0-9.]/g, '') || '0';
    return `${size}"×${item.length}' ${item.weight}KG ${main.name}`;
}

function sortMainCategories(cats) {
    return [...cats].sort((a, b) => {
        let codeA = a.code || String(a.id).padStart(2, '0');
        let codeB = b.code || String(b.id).padStart(2, '0');
        return codeA.localeCompare(codeB);
    });
}

function sortSubCategories(subs) {
    return [...subs].sort((a, b) => {
        let numA = parseFloat(a.name.replace(/[^0-9.]/g, '')) || 0;
        let numB = parseFloat(b.name.replace(/[^0-9.]/g, '')) || 0;
        return numA - numB;
    });
}

function sortItems(itemsList) {
    return [...itemsList].sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return (a.weight || 0) - (b.weight || 0);
    });
}

function switchModule(module) {
    currentModule = module;
    console.log('StockFlow: Switching to module:', module);
    document.querySelectorAll('.menu-item').forEach((btn, index) => {
        btn.classList.remove('active');
        if (module === 'finishGood' && index === 0) btn.classList.add('active');
        if (module === 'rawMaterials' && index === 1) btn.classList.add('active');
        if (module === 'store' && index === 2) btn.classList.add('active');
        if (module === 'settings' && index === 3) btn.classList.add('active');
    });

    // Hide all main panels and tabs
    document.getElementById('finishGoodTabs').style.display = 'none';
    document.getElementById('rawMaterialsTabs').style.display = 'none';
    document.getElementById('storeTabs').style.display = 'none';
    
    document.getElementById('finishGoodPanel').style.display = 'none';
    document.getElementById('rawMaterialsPanel').style.display = 'none';
    document.getElementById('storePanel').style.display = 'none';
    document.getElementById('settingsPanel').style.display = 'none';
    
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    if (module === 'finishGood') {
        document.getElementById('finishGoodPanel').style.display = 'block';
        document.getElementById('finishGoodTabs').style.display = 'flex';
        let activeTab = document.querySelector('.nav-tab.active');
        if (activeTab) {
            let tabNameText = activeTab.textContent.toLowerCase();
            let tabName = 'dashboard';
            if (tabNameText.includes('data entry')) tabName = 'dataEntry';
            else if (tabNameText.includes('orders')) tabName = 'orders';
            else if (tabNameText.includes('categories')) tabName = 'categories';
            else if (tabNameText.includes('customers')) tabName = 'customers';
            else if (tabNameText.includes('stock list')) tabName = 'stockList';
            else if (tabNameText.includes('audit')) tabName = 'audit';
            else if (tabNameText.includes('low stock')) tabName = 'lowStockReport';
            showTab(tabName);
        } else {
            showTab('dashboard');
        }
    } else if (module === 'settings') {
        document.getElementById('settingsPanel').style.display = 'block';
        if (typeof refreshUsersList === 'function') refreshUsersList();
    } else if (module === 'rawMaterials') {
        document.getElementById('rawMaterialsPanel').style.display = 'block';
        document.getElementById('rawMaterialsTabs').style.display = 'flex';
        const activeTabBtn = document.querySelector('#rawMaterialsTabs .nav-tab.active');
        if (activeTabBtn) {
            const onclickArr = activeTabBtn.getAttribute('onclick').match(/'([^']+)'/);
            showTab(onclickArr ? onclickArr[1] : 'rm_dashboard');
        } else {
            showTab('rm_dashboard');
        }
    } else if (module === 'store') {
        document.getElementById('storePanel').style.display = 'block';
        document.getElementById('storeTabs').style.display = 'flex';
        const activeTabBtn = document.querySelector('#storeTabs .nav-tab.active');
        if (activeTabBtn) {
            const onclickArr = activeTabBtn.getAttribute('onclick').match(/'([^']+)'/);
            showTab(onclickArr ? onclickArr[1] : 'store_dashboard');
        } else {
            showTab('store_dashboard');
        }
    }
    enforceGlobalPermissions();
}

function togglePassword(fieldId) {
    let password = document.getElementById(fieldId);
    password.type = password.type === 'password' ? 'text' : 'password';
}

function login() {
    console.log('StockFlow: Login attempt...');
    let usernameInput = document.getElementById('username');
    let passwordInput = document.getElementById('password');
    let username = usernameInput ? usernameInput.value : '';
    let password = passwordInput ? passwordInput.value : '';

    if (!users || users.length === 0) {
        console.warn('StockFlow: No users loaded, trying legacy fallback...');
        loadLegacyData();
        if (!users || users.length === 0) {
            alert('Loading user data. Please try again in a moment or check your connection.');
            return;
        }
    }

    let user = users.find(u => u.username === username && u.password === password);
    console.log('StockFlow: Matching user found:', user ? 'Yes' : 'No');

    if (user) {
        currentUser = user;
        localStorage.setItem('stock_currentUser', JSON.stringify(user));

        
        const loginPage = document.getElementById('loginPage');
        const appPage = document.getElementById('app');
        if (loginPage) loginPage.style.display = 'none';
        if (appPage) appPage.style.display = 'block';
        
        updateCompanyDisplay();
        refreshDashboard();
        refreshTransactions();
        refreshOrdersList();
        refreshCategoriesView();
        refreshStockList();
        refreshLowStockReport();
        refreshUsersList();
        refreshCustomersList();
        switchModule('finishGood');
        enforceGlobalPermissions();
    } else {
        alert('Invalid entry or account not found. Loaded Users: ' + (users ? users.length : 0));
    }
}

document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && document.getElementById('loginPage').style.display !== 'none') {
        login();
    }
});

(function () {
    if (currentUser) {
        // Find most recent user record to get updated permissions
        const freshUser = users.find(u => u.id == currentUser.id);
        if (freshUser) {
            currentUser = freshUser;
            localStorage.setItem('stock_currentUser', JSON.stringify(freshUser));
        }
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        updateCompanyDisplay();
        refreshDashboard();
        refreshTransactions();
        refreshOrdersList();
        refreshCategoriesView();
        refreshStockList();
        refreshLowStockReport();
        refreshUsersList();
        refreshCustomersList();
        switchModule('finishGood');
        enforceGlobalPermissions();
    }
})();

function logout() {
    currentUser = null;
    localStorage.removeItem('stock_currentUser');
    showLogin();
}

function showLogin() {
    const loginPage = document.getElementById('loginPage');
    const appPage = document.getElementById('app');
    if (loginPage) loginPage.style.display = 'block';
    if (appPage) appPage.style.display = 'none';
}

function hideLogin() {
    const loginPage = document.getElementById('loginPage');
    const appPage = document.getElementById('app');
    if (loginPage) loginPage.style.display = 'none';
    if (appPage) appPage.style.display = 'block';
}

function formatDate(dateString, includeTime = true) {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    
    // Always use manual formatting to be safe across all browsers
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthShort = monthNames[d.getMonth()];
    
    let formattedDate = "";
    switch (window.systemDateFormat) {
        case 'DD-MMM-YYYY': formattedDate = `${day}-${monthShort}-${year}`; break;
        case 'DD-MM-YYYY':  formattedDate = `${day}-${month}-${year}`; break;
        case 'DD/MM/YYYY':  formattedDate = `${day}/${month}/${year}`; break;
        case 'YYYY-MM-DD':  formattedDate = `${year}-${month}-${day}`; break;
        default:            formattedDate = `${day}-${month}-${year}`;
    }
    
    if (includeTime) {
        const hours = String(d.getHours() % 12 || 12).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
        return `${formattedDate} ${hours}:${minutes} ${ampm}`;
    }
    return formattedDate;
}

function filterTable(tableId, searchText) {
    let table = document.getElementById(tableId);
    if (!table) return;
    let rows = table.getElementsByTagName('tr');
    searchText = searchText.toLowerCase();
    for (let i = 1; i < rows.length; i++) {
        let row = rows[i];
        if (row.cells.length < 2) continue;
        let text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchText) ? '' : 'none';
    }
}

function showAddCustomerModal() {
    document.getElementById('customerModalTitle').textContent = '➕ Add Customer';
    document.getElementById('editCustomerId').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('customerMobile').value = '';
    document.getElementById('customerUniqueId').value = '';
    document.getElementById('customerModal').style.display = 'block';
}

function closeCustomerModal() {
    document.getElementById('customerModal').style.display = 'none';
}

async function saveCustomer() {
    let id = document.getElementById('editCustomerId').value;
    let name = document.getElementById('customerName').value.trim();
    let address = document.getElementById('customerAddress').value.trim();
    let mobile = document.getElementById('customerMobile').value.trim();
    let uniqueInput = document.getElementById('customerUniqueId').value.trim();

    if (!name) {
        alert('Please enter customer name');
        return;
    }

    let customerData = {
        name: name,
        address: address,
        mobile: mobile,
        uniqueId: uniqueInput || (id ? customers.find(c => c.id == id)?.uniqueId : 'CUST' + String(customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1).padStart(4, '0')),
        mainId: parseInt(document.getElementById('customerProvinceSelect').value) || null,
        subId: parseInt(document.getElementById('customerDistrictSelect').value) || null
    };
    if (id) customerData.id = parseInt(id);
    
    if (!customerData.mainId || !customerData.subId) {
        alert('Please select both Province and District.');
        return;
    }

    try {
        const response = await fetch('api/sync.php?action=save_customer', {
            method: 'POST',
            body: JSON.stringify({ customer: customerData })
        });
        const result = await response.json();
        if (result.status === 'success') {
            customerData.id = result.id;
            if (id) {
                let idx = customers.findIndex(c => c.id == id);
                if (idx !== -1) customers[idx] = customerData;
            } else {
                customers.push(customerData);
            }
            saveData();
            refreshCustomersList();
            closeCustomerModal();
            alert(id ? 'Customer updated successfully!' : 'Customer added successfully!');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        console.error('Customer save failed:', e);
        alert('Server error. Save failed.');
    }
}

function refreshCustomersList() {
    let container = document.getElementById('customersList');
    let html = '';
    
    if (customerProvinces.length === 0) {
        html = '<div style="text-align:center; padding:2rem; color:var(--gray-500);">No provinces added yet. Click "Add Province" to start.</div>';
        container.innerHTML = html;
        return;
    }

    sortProvinces(customerProvinces).forEach(prov => {
        let provDistricts = customerDistricts.filter(d => d.mainId == prov.id);
        let provCustomers = customers.filter(c => c.mainId == prov.id);
        
        let districtHtml = '';
        sortDistricts(provDistricts).forEach(dist => {
            let distCustomers = customers.filter(c => c.mainId == prov.id && c.subId == dist.id);
            
            let customerRows = '';
            distCustomers.forEach(c => {
                customerRows += `
                    <div class="item-row" style="background:white; margin-bottom:0.5rem; border-radius:0.5rem; padding:0.8rem;">
                        <div class="item-info">
                            <span class="item-name-badge" style="background:var(--orange-500);">${c.uniqueId}</span>
                            <span style="font-weight:600; font-size:1.1rem; margin-left:0.5rem;">${c.name}</span>
                            <div style="font-size:0.85rem; color:var(--gray-500); margin-top:0.3rem;">
                                📍 ${c.address || 'No address'} | 📞 ${c.mobile || 'No mobile'}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon btn-icon-sm" onclick="editCustomer(${c.id})" title="Edit">✏️</button>
                            <button class="btn-icon btn-icon-sm" onclick="deleteCustomer(${c.id})" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;
            });

            districtHtml += `
                <div class="sub-category" id="custDist_${dist.id}">
                    <div class="sub-header" onclick="toggleSubCategory(this)">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span class="sub-name">🏘️ ${dist.name}</span>
                            <span class="sub-stats">${distCustomers.length} Customers</span>
                        </div>
                        <div class="sub-actions">
                            <button class="btn-icon btn-icon-sm" onclick="editCustDistrict(${dist.id}); event.stopPropagation();" title="Edit District">✏️</button>
                            <button class="btn-icon btn-icon-sm" onclick="deleteCustDistrict(${dist.id}); event.stopPropagation();" title="Delete District">🗑️</button>
                            <button class="add-btn add-btn-sm" onclick="showAddCustomerFor(${prov.id}, ${dist.id}); event.stopPropagation();">+ Add Customer</button>
                        </div>
                    </div>
                    <div class="items-container">
                        ${customerRows || '<div style="color: var(--gray-500); text-align: center; padding: 1rem;">No customers in this district</div>'}
                    </div>
                </div>
            `;
        });

        html += `
            <div class="main-category" id="custProv_${prov.id}">
                <div class="category-header" onclick="toggleMainCategory(this)">
                    <div class="category-title">
                        <span class="color-dot" style="background: var(--orange-500);"></span>
                        <span class="category-name">🗺️ ${prov.name}</span>
                        <span class="category-stats">${provCustomers.length} Total Customers</span>
                    </div>
                    <div class="category-actions">
                        <button class="btn-icon" onclick="editCustProvince(${prov.id}); event.stopPropagation();" title="Edit Province">✏️</button>
                        <button class="btn-icon" onclick="deleteCustProvince(${prov.id}); event.stopPropagation();" title="Delete Province">🗑️</button>
                        <button class="add-btn" onclick="showAddCustDistrictModalFor(${prov.id}); event.stopPropagation();">+ Add District</button>
                    </div>
                </div>
                <div class="sub-category-container">
                    ${districtHtml || '<div style="color: var(--gray-500); text-align: center; padding: 2rem;">No districts added yet.</div>'}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Helpers for sorting
function sortProvinces(arr) { return [...arr].sort((a,b) => a.name.localeCompare(b.name)); }
function sortDistricts(arr) { return [...arr].sort((a,b) => a.name.localeCompare(b.name)); }

function filterCustomers() {
    let search = document.getElementById('customerSearch').value.toLowerCase();
    // In grouped view, we might need a different search approach or just highlight.
    // Simplifying: If searching, show flat list. If empty, show grouped.
    let container = document.getElementById('customersList');
    if (!search) {
        refreshCustomersList();
        return;
    }
    
    let filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search) ||
        (c.uniqueId && c.uniqueId.toLowerCase().includes(search)) ||
        (c.address && c.address.toLowerCase().includes(search)) ||
        (c.mobile && c.mobile.toLowerCase().includes(search))
    );
    
    let html = '<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:1rem;">';
    filtered.forEach(c => {
        html += `
            <div style="background:var(--orange-100); padding:1rem; border-radius:1rem; border:1px solid var(--orange-200);">
                <span class="item-name-badge" style="background:var(--orange-500);">${c.uniqueId}</span>
                <h4 style="margin:0.5rem 0;">${c.name}</h4>
                <div style="font-size:0.85rem; color:var(--gray-500);">📞 ${c.mobile || 'No mobile'}</div>
                <div style="font-size:0.85rem; color:var(--gray-500);">📍 ${c.address || 'No address'}</div>
                <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                    <button class="btn btn-primary btn-sm" onclick="editCustomer(${c.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})">Delete</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = filtered.length ? html : '<div style="text-align:center; padding:2rem; color:var(--gray-500);">No matching customers</div>';
}

function showAddCustomerModal() {
    document.getElementById('customerModalTitle').textContent = '➕ Add Customer';
    document.getElementById('editCustomerId').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('customerMobile').value = '';
    document.getElementById('customerUniqueId').value = '';
    
    populateProvinceSelect('customerProvinceSelect');
    updateCustomerDistrictSelect();
    
    document.getElementById('customerModal').style.display = 'block';
}

function showAddCustomerFor(provId, distId) {
    showAddCustomerModal();
    document.getElementById('customerProvinceSelect').value = provId;
    updateCustomerDistrictSelect();
    document.getElementById('customerDistrictSelect').value = distId;
}

function editCustomer(id) {
    let customer = customers.find(c => c.id == id);
    if (customer) {
        document.getElementById('customerModalTitle').textContent = '✏️ Edit Customer';
        document.getElementById('editCustomerId').value = customer.id;
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerAddress').value = customer.address || '';
        document.getElementById('customerMobile').value = customer.mobile || '';
        document.getElementById('customerUniqueId').value = customer.uniqueId || '';
        
        populateProvinceSelect('customerProvinceSelect');
        document.getElementById('customerProvinceSelect').value = customer.mainId || '';
        updateCustomerDistrictSelect();
        document.getElementById('customerDistrictSelect').value = customer.subId || '';
        
        document.getElementById('customerModal').style.display = 'block';
    }
}

function populateProvinceSelect(id) {
    let select = document.getElementById(id);
    select.innerHTML = '<option value="">-- Select Province --</option>';
    sortProvinces(customerProvinces).forEach(p => {
        let opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}

function updateCustomerDistrictSelect() {
    let provId = document.getElementById('customerProvinceSelect').value;
    let distSelect = document.getElementById('customerDistrictSelect');
    distSelect.innerHTML = '<option value="">-- Select District --</option>';
    
    if (provId) {
        let filtered = customerDistricts.filter(d => d.mainId == provId);
        sortDistricts(filtered).forEach(d => {
            let opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            distSelect.appendChild(opt);
        });
    }
}


async function deleteCustomer(id) {
    if (confirm('Are you sure?')) {
        try {
            const response = await fetch('api/sync.php?action=delete_customer', {
                method: 'POST',
                body: JSON.stringify({ id: id })
            });
            const result = await response.json();
            if (result.status === 'success') {
                customers = customers.filter(c => c.id !== id);
                saveData();
                refreshCustomersList();
                alert('Customer deleted.');
            } else {
                alert('Delete failed: ' + result.message);
            }
        } catch (e) {
            alert('Server error.');
        }
    }
}

// Brand Low Stock Settings
function refreshBrandLowStockSettings() {
    let container = document.getElementById('brandLowStockSettings');
    let html = '';
    sortMainCategories(mainCategories).forEach(brand => {
        html += `
                    <div class="brand-lowstock-card">
                        <div class="brand-lowstock-header">
                            <span class="brand-color-dot" style="background: ${brand.color};"></span>
                            <h4>${brand.name}</h4>
                        </div>
                        <div class="brand-lowstock-input">
                            <input type="number" id="brandLow_${brand.id}" value="${brand.lowStockLimit || 10}">
                            <button class="btn btn-primary btn-sm" onclick="updateBrandLowStock(${brand.id})">Update</button>
                        </div>
                    </div>
                `;
    });
    container.innerHTML = html;
}

async function updateBrandLowStock(brandId) {
    let input = document.getElementById(`brandLow_${brandId}`);
    let newLimit = parseInt(input.value);
    if (newLimit && newLimit > 0) {
        let brand = mainCategories.find(b => b.id === brandId);
        if (brand) {
            brand.lowStockLimit = newLimit;
            // Sync to server
            try {
                await fetch('api/sync.php?action=save_category', {
                    method: 'POST',
                    body: JSON.stringify({ type: 'main', category: brand })
                });
                
                items.forEach(item => {
                    if (item.mainId === brandId && !item.customMinStock) {
                        item.minStock = newLimit;
                    }
                });
                saveData();
                refreshDashboard();
                refreshStockList();
                refreshLowStockReport();
                alert(`${brand.name} limit updated to ${newLimit} and synced to server.`);
            } catch (e) {
                alert('Limit updated locally, but server sync failed.');
            }
        }
    } else {
        alert('Enter valid number');
    }
}

// Searchable Customer Dropdown
function createCustomerSearchable(placeholder, onSelect, initialValue = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-wrapper';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'searchable-input';
    input.placeholder = placeholder;
    input.value = initialValue;
    wrapper.appendChild(input);
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-dropdown';
    wrapper.appendChild(dropdown);
    let filteredCustomers = [];
    let selectedIndex = -1;

    function filterOptions(searchText) {
        searchText = searchText.toLowerCase();
        if (!searchText) {
            filteredCustomers = customers.slice(0, 10);
        } else {
            filteredCustomers = customers.filter(c =>
                c.name.toLowerCase().includes(searchText) ||
                (c.address && c.address.toLowerCase().includes(searchText)) ||
                (c.mobile && c.mobile.toLowerCase().includes(searchText)) ||
                (c.uniqueId && c.uniqueId.toLowerCase().includes(searchText))
            ).slice(0, 10);
        }
        renderDropdown();
    }

    function renderDropdown() {
        if (filteredCustomers.length === 0) {
            dropdown.innerHTML = '<div class="searchable-item">No customers found</div>';
        } else {
            dropdown.innerHTML = filteredCustomers.map((c, index) => `
                        <div class="searchable-item ${index === selectedIndex ? 'selected' : ''}" data-id="${c.id}" data-name="${c.name}" data-address="${c.address || ''}" data-mobile="${c.mobile || ''}" data-unique="${c.uniqueId}">
                            <strong>${c.name}</strong> <span class="customer-badge">${c.uniqueId}</span><br>
                            <small>${c.address || 'No address'} | ${c.mobile || 'No mobile'}</small>
                        </div>
                    `).join('');

            dropdown.querySelectorAll('.searchable-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    let name = item.dataset.name;
                    let id = item.dataset.id;
                    let unique = item.dataset.unique;
                    input.value = name + ' (' + unique + ')';
                    if (onSelect) onSelect({ id: parseInt(id), name, uniqueId: unique });
                    dropdown.classList.remove('show');
                });
            });
        }
    }

    input.addEventListener('input', () => {
        filterOptions(input.value);
        dropdown.classList.add('show');
        selectedIndex = -1;
    });
    input.addEventListener('focus', () => {
        filterOptions(input.value);
        dropdown.classList.add('show');
    });
    input.addEventListener('keydown', (e) => {
        if (!dropdown.classList.contains('show')) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                dropdown.classList.add('show');
                filterOptions(input.value);
            }
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, filteredCustomers.length - 1);
                renderDropdown();
                const selectedDown = dropdown.querySelector('.searchable-item.selected');
                if (selectedDown) selectedDown.scrollIntoView({ block: 'nearest' });
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                renderDropdown();
                const selectedUp = dropdown.querySelector('.searchable-item.selected');
                if (selectedUp) selectedUp.scrollIntoView({ block: 'nearest' });
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && filteredCustomers[selectedIndex]) {
                    let c = filteredCustomers[selectedIndex];
                    input.value = c.name + ' (' + c.uniqueId + ')';
                    if (onSelect) onSelect(c);
                    dropdown.classList.remove('show');
                }
                break;
            case 'Escape':
            case 'Tab':
                dropdown.classList.remove('show');
                break;
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    return wrapper;
}

// Searchable Input with Quick Add
function createSearchableInput(placeholder, options, onSelect, disabled = false, quickAddType = null, quickAddData = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'searchable-wrapper';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'searchable-input';
    input.placeholder = placeholder;
    input.disabled = disabled;
    wrapper.appendChild(input);
    const dropdown = document.createElement('div');
    dropdown.className = 'searchable-dropdown';
    wrapper.appendChild(dropdown);
    let filteredOptions = [];
    let selectedIndex = -1;

    function filterOptions(searchText) {
        searchText = searchText.toLowerCase();
        if (!searchText) {
            filteredOptions = options.slice(0, 10);
        } else {
            filteredOptions = options.filter(opt =>
                opt.text.toLowerCase().includes(searchText) ||
                (opt.searchText && opt.searchText.toLowerCase().includes(searchText))
            ).slice(0, 10);
        }
        renderDropdown();
    }

    function renderDropdown() {
        let html = '';
        if (filteredOptions.length === 0) {
            html = '<div class="searchable-item">No results found</div>';
        } else {
            html = filteredOptions.map((opt, index) => `
                        <div class="searchable-item ${index === selectedIndex ? 'selected' : ''}" data-value="${opt.value}">
                            ${opt.text}
                            ${opt.stock !== undefined ? `<span style="float: right; color: ${opt.stock <= (opt.lowStockLimit || 10) ? '#ff5252' : '#4caf50'}; font-weight: bold;">Stock: ${opt.stock}</span>` : ''}
                        </div>
                    `).join('');
        }

        if (quickAddType) {
            const isSelected = selectedIndex === filteredOptions.length;
            html += `<div class="searchable-item quick-add-option ${isSelected ? 'selected' : ''}" onclick="${quickAddType === 'brand' ? 'showQuickAddBrand()' : quickAddType === 'size' ? 'showQuickAddSize(' + quickAddData + ')' : quickAddType === 'item' ? 'showQuickAddItem(' + quickAddData.brandId + ',' + quickAddData.sizeId + ')' : ''}">
                        <span class="quick-add-icon">⚡</span> Quick Add New ${quickAddType === 'brand' ? 'Brand' : quickAddType === 'size' ? 'Size' : 'Item'}
                    </div>`;
        }

        dropdown.innerHTML = html;

        dropdown.querySelectorAll('.searchable-item:not(.quick-add-option)').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = item.dataset.value;
                const selectedOpt = filteredOptions.find(opt => opt.value == value);
                if (selectedOpt) {
                    input.value = selectedOpt.text;
                    if (onSelect) onSelect(selectedOpt);
                    dropdown.classList.remove('show');
                }
            });
        });
    }

    input.addEventListener('input', () => {
        filterOptions(input.value);
        dropdown.classList.add('show');
        selectedIndex = -1;
    });
    input.addEventListener('focus', () => {
        filterOptions(input.value);
        dropdown.classList.add('show');
    });
    input.addEventListener('keydown', (e) => {
        if (!dropdown.classList.contains('show')) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                dropdown.classList.add('show');
                filterOptions(input.value);
            }
            return;
        }

        const totalVisible = filteredOptions.length + (quickAddType ? 1 : 0);
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, totalVisible - 1);
                renderDropdown();
                const selectedDown = dropdown.querySelector('.searchable-item.selected');
                if (selectedDown) selectedDown.scrollIntoView({ block: 'nearest' });
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                renderDropdown();
                const selectedUp = dropdown.querySelector('.searchable-item.selected');
                if (selectedUp) selectedUp.scrollIntoView({ block: 'nearest' });
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    if (selectedIndex < filteredOptions.length) {
                        const opt = filteredOptions[selectedIndex];
                        input.value = opt.text;
                        if (onSelect) onSelect(opt);
                        dropdown.classList.remove('show');
                    } else if (quickAddType) {
                        dropdown.classList.remove('show');
                        if (quickAddType === 'brand') showQuickAddBrand();
                        else if (quickAddType === 'size') showQuickAddSize(quickAddData);
                        else if (quickAddType === 'item') showQuickAddItem(quickAddData.brandId, quickAddData.sizeId);
                    }
                }
                break;
            case 'Escape':
            case 'Tab':
                dropdown.classList.remove('show');
                break;
        }
    });
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    return wrapper;
}

// Quick Add Functions
function showQuickAddBrand() {
    document.getElementById('quickBrandName').value = '';
    document.getElementById('quickBrandCode').value = '';
    document.getElementById('quickBrandColor').value = '#2196f3';
    document.getElementById('quickBrandLowStock').value = '10';
    document.getElementById('quickAddBrandModal').style.display = 'block';
}

function closeQuickAddBrandModal() {
    document.getElementById('quickAddBrandModal').style.display = 'none';
}

async function saveQuickBrand() {
    let name = document.getElementById('quickBrandName').value;
    let code = document.getElementById('quickBrandCode').value;
    let color = document.getElementById('quickBrandColor').value;
    let lowStock = parseInt(document.getElementById('quickBrandLowStock').value) || 10;

    if (!name) {
        alert('Please enter brand name');
        return;
    }

    let catData = { name, color, lowStockLimit: lowStock };
    
    try {
        const response = await fetch('api/sync.php?action=save_category', {
            method: 'POST',
            body: JSON.stringify({ category: catData, type: 'main' })
        });
        const result = await response.json();
        if (result.status === 'success') {
            catData.id = result.id;
            catData.code = code || String(result.id).padStart(2, '0');
            mainCategories.push(catData);
            saveData();
            closeQuickAddBrandModal();
            refreshDashboard();
            refreshCategoriesView();
            refreshStockList();
            refreshLowStockReport();
            alert(`Brand "${name}" added!`);
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Sync failed.');
    }
}

function showQuickAddSize(brandId) {
    let brand = mainCategories.find(m => m.id == brandId);
    if (!brand) return;

    document.getElementById('quickSizeBrandId').value = brandId;
    document.getElementById('quickSizeBrandName').value = brand.name;
    document.getElementById('quickSizeName').value = '';
    document.getElementById('quickSizeUnit').value = 'inch';
    document.getElementById('quickAddSizeModal').style.display = 'block';
}

function closeQuickAddSizeModal() {
    document.getElementById('quickAddSizeModal').style.display = 'none';
}

async function saveQuickSize() {
    let brandId = parseInt(document.getElementById('quickSizeBrandId').value);
    let sizeValue = document.getElementById('quickSizeName').value;
    let unit = document.getElementById('quickSizeUnit').value;

    if (!sizeValue) {
        alert('Please enter size');
        return;
    }

    let fullName = sizeValue + (unit === 'inch' ? '"' : 'mm');
    let subData = { name: fullName, mainId: brandId };

    try {
        const response = await fetch('api/sync.php?action=save_category', {
            method: 'POST',
            body: JSON.stringify({ category: subData, type: 'sub' })
        });
        const result = await response.json();
        if (result.status === 'success') {
            subData.id = result.id;
            // Generate code locally for now
            let main = mainCategories.find(m => m.id === brandId);
            let mainCode = (main && main.code) ? main.code : String(brandId).padStart(2, '0');
            let existingSubs = subCategories.filter(s => s.mainId === brandId);
            let maxSeq = 0;
            existingSubs.forEach(s => {
                if (s.code && typeof s.code === 'string') {
                    let seq = parseInt(s.code.slice(mainCode.length)) || 0;
                    if (seq > maxSeq) maxSeq = seq;
                }
            });
            subData.code = mainCode + String(maxSeq + 1).padStart(3, '0');
            
            subCategories.push(subData);
            saveData();
            closeQuickAddSizeModal();
            refreshCategoriesView();
            alert(`Size "${fullName}" added!`);
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Sync failed.');
    }
}

// Quick Add Item Logic
function showQuickAddItem(brandId, sizeId) {
    if (!brandId || !sizeId) {
        alert('Please select Brand and Size first');
        return;
    }
    document.getElementById('quickItemMainId').value = brandId;
    document.getElementById('quickItemSubId').value = sizeId;
    document.getElementById('quickItemWeight').value = '';
    updateLengthDropdowns('quickItemLength');
    document.getElementById('quickItemLength').value = '13';
    document.getElementById('quickAddItemModal').style.display = 'block';
}

function updateLengthDropdowns(targetId = null) {
    const ids = targetId ? [targetId] : ['itemLength', 'quickItemLength'];
    const lengths = [...new Set(companySettings.availableLengths)].sort((a, b) => a - b);
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const currentVal = el.value;
        el.innerHTML = lengths.map(l => `<option value="${l}">${l}</option>`).join('');
        if (currentVal && lengths.includes(parseFloat(currentVal))) {
            el.value = currentVal;
        } else if (id === 'itemLength' || id === 'quickItemLength') {
            el.value = '13'; // Default fallback
        }
    });
}

function promptNewLength(targetId) {
    const newVal = prompt("Enter new length (ft):");
    if (newVal === null || newVal.trim() === "") return;
    
    const numVal = parseFloat(newVal);
    if (isNaN(numVal) || numVal <= 0) {
        alert("Please enter a valid positive number.");
        return;
    }
    
    if (!companySettings.availableLengths.includes(numVal)) {
        companySettings.availableLengths.push(numVal);
        saveLengthSettings();
    }
    
    updateLengthDropdowns();
    document.getElementById(targetId).value = numVal;
}

async function saveLengthSettings() {
    try {
        await fetch('api/sync.php?action=save_settings', {
            method: 'POST',
            body: JSON.stringify({
                settings: { availableLengths: JSON.stringify(companySettings.availableLengths) }
            })
        });
    } catch (e) { console.error('Failed to save lengths list:', e); }
}

function closeQuickAddItemModal() {
    document.getElementById('quickAddItemModal').style.display = 'none';
}

async function saveQuickItem() {
    let weight = parseFloat(document.getElementById('quickItemWeight').value);
    let length = parseFloat(document.getElementById('quickItemLength').value);
    let mainId = parseInt(document.getElementById('quickItemMainId').value);
    let subId = parseInt(document.getElementById('quickItemSubId').value);

    if (!weight || weight <= 0) {
        alert('Please enter a valid weight');
        return;
    }

    let itemData = {
        mainId,
        subId,
        length,
        weight,
        stock: 0,
        lowStockLimit: parseInt(document.getElementById('quickItemLowStock').value) || null
    };

    try {
        const response = await fetch('api/sync.php?action=save_item', {
            method: 'POST',
            body: JSON.stringify({ item: itemData })
        });
        const result = await response.json();
        if (result.status === 'success') {
            itemData.id = result.id;
            items.push(itemData);
            saveData();
            closeQuickAddItemModal();
            refreshDashboard();
            refreshCategoriesView();
            refreshStockList();
            refreshLowStockReport();
            alert('New item added successfully!');
            // Re-render transactions to update the item search dropdown
            refreshTransactions();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Sync failed.');
    }
}

// Collapse Functions
function toggleStatCard(card) {
    card.classList.toggle('expanded');
}

function toggleBrandCard(card) {
    card.classList.toggle('expanded');
}

function toggleLowBrandCard(card) {
    card.classList.toggle('expanded');
}

function toggleMainCategory(header) {
    const mainCategory = header.closest('.main-category');
    mainCategory.classList.toggle('expanded');
}

function toggleSubCategory(header) {
    const subCategory = header.closest('.sub-category');
    subCategory.classList.toggle('expanded');
}

// Dashboard Functions
let myBarChart = null;
let myDonutChart = null;

function refreshDashboard() {
    let moduleItems = items;
    let totalItems = moduleItems.length;
    let totalStock = moduleItems.reduce((sum, i) => sum + (i.stock || 0), 0);
    let totalKg = moduleItems.reduce((sum, i) => sum + ((i.stock || 0) * (i.weight || 0)), 0);

    // Low stock items by brand
    let lowStockByBrand = {};
    let globalLowStockItems = [];

    moduleItems.forEach(item => {
        let main = mainCategories.find(m => m.id == item.mainId);
        let min = item.lowStockLimit || main?.lowStockLimit || 10;
        if (parseInt(item.stock) <= parseInt(min)) {
            globalLowStockItems.push({ item, main, min });
            if (main) {
                if (!lowStockByBrand[main.id]) {
                    lowStockByBrand[main.id] = { name: main.name, count: 0 };
                }
                lowStockByBrand[main.id].count++;
            }
        }
    });

    let lowStockHtml = '';
    for (let brandId in lowStockByBrand) {
        lowStockHtml += `<div class="stat-expand-item"><span>${lowStockByBrand[brandId].name}</span><span>${lowStockByBrand[brandId].count} items</span></div>`;
    }

    // Calculate Shortages (Negative Stock based on Pending Orders)
    let requiredQtys = {};
    orders.filter(o => {
        const s = (o.status || '').toLowerCase();
        return s === 'pending' || s === 'processing';
    }).forEach(order => {
        (order.items || []).forEach(item => {
            const needed = parseInt(item.quantity || 0) - parseInt(item.fulfilled || 0);
            if (needed > 0) {
                requiredQtys[item.itemId] = (requiredQtys[item.itemId] || 0) + needed;
            }
        });
    });

    let shortfallItems = [];
    moduleItems.forEach(item => {
        const required = requiredQtys[item.id] || 0;
        const available = parseInt(item.stock || 0);
        if (available < required) {
            let main = mainCategories.find(m => m.id == item.mainId);
            let sub = subCategories.find(s => s.id == item.subId);
            shortfallItems.push({ 
                item, 
                main, 
                sub, 
                shortfall: available - required,
                required: required
            });
        }
    });

    document.getElementById('dashboardStats').innerHTML = `
                <div class="stat-card" onclick="toggleStatCard(this)">
                    <h3>Stock Shortage</h3>
                    <div class="number">${shortfallItems.length}</div>
                    <div class="sub">Items needed for orders</div>
                </div>
                <div class="stat-card" onclick="toggleStatCard(this)">
                    <h3>Total Stock</h3>
                    <div class="number">${totalStock} PCS</div>
                    <div class="sub">${totalKg.toFixed(2)} KG</div>
                    <div class="stat-expand">
                        <div class="stat-expand-item"><span>Total Pieces</span><span>${totalStock}</span></div>
                        <div class="stat-expand-item"><span>Total Weight</span><span>${totalKg.toFixed(2)} KG</span></div>
                    </div>
                </div>
                <div class="stat-card" onclick="toggleStatCard(this)">
                    <h3>Low Stock</h3>
                    <div class="number">${globalLowStockItems.length}</div>
                    <div class="stat-expand">
                        ${lowStockHtml || '<div class="stat-expand-item">No low stock items</div>'}
                    </div>
                </div>
            `;

    // Brand Cards - Static & Uniform
    let brandCardsHtml = '';
    let brandData = [];

    sortMainCategories(mainCategories).forEach(main => {
        let brandItems = items.filter(i => i.mainId == main.id);
        let totalBrandStock = brandItems.reduce((sum, i) => sum + (parseInt(i.stock) || 0), 0);
        let totalBrandKg = brandItems.reduce((sum, i) => sum + ((parseInt(i.stock) || 0) * (parseFloat(i.weight) || 0)), 0);

        brandData.push({ name: main.name, stock: totalBrandStock, kg: totalBrandKg, color: main.color });

        brandCardsHtml += `
                    <div class="brand-card static">
                        <div class="brand-header" style="background: ${main.color};">
                            <h4>${main.name}</h4>
                            <span class="brand-total">${totalBrandStock} PCS<br>${totalBrandKg.toFixed(2)} KG</span>
                        </div>
                    </div>
                `;
    });
    document.getElementById('brandStockCards').innerHTML = brandCardsHtml;

    // Render Charts
    renderAdvancedCharts(brandData);

    // Render Alerts (Grouped by Brand)
    let alertsHtml = '';
    if (globalLowStockItems.length === 0) {
        alertsHtml = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500); padding: 1rem;">No critical low stock alerts</div>';
    } else {
        // Group by brand
        let groupedLowStock = {};
        globalLowStockItems.forEach(({ item, main, min }) => {
            let brandName = main ? main.name : 'Other';
            if (!groupedLowStock[brandName]) groupedLowStock[brandName] = [];
            groupedLowStock[brandName].push({ item, main, min });
        });

        for (let brand in groupedLowStock) {
            alertsHtml += `<div class="alert-group-header">🏷️ ${brand}</div>`;
            groupedLowStock[brand].forEach(({ item, main, min }) => {
                let sub = subCategories.find(s => s.id == item.subId);
                let size = sub ? sub.name : '?';
                alertsHtml += `
                    <div class="alert-card warning">
                        <div class="alert-info">
                            <h4>${main ? main.name : 'Unknown'} ${size}</h4>
                            <p>${item.length}ft / ${item.weight}KG (Limit: ${min})</p>
                        </div>
                        <div class="alert-qty">${item.stock}</div>
                    </div>
                `;
            });
        }
    }
    document.getElementById('lowStockAlertsContainer').innerHTML = alertsHtml;

    // Render Shortage Alerts (Grouped by Brand)
    let shortageHtml = '';
    if (shortfallItems.length === 0) {
        shortageHtml = '<div style="grid-column: 1/-1; text-align: center; color: var(--gray-500); padding: 1rem;">All order requirements are met! No shortages.</div>';
    } else {
        // Group by brand
        let groupedShortage = {};
        shortfallItems.forEach(({ item, main, sub, shortfall, required }) => {
            let brandName = main ? main.name : 'Other';
            if (!groupedShortage[brandName]) groupedShortage[brandName] = [];
            groupedShortage[brandName].push({ item, main, sub, shortfall, required });
        });

        for (let brand in groupedShortage) {
            shortageHtml += `<div class="alert-group-header">📦 ${brand} Shortages</div>`;
            groupedShortage[brand].forEach(({ item, main, sub, shortfall, required }) => {
                let size = sub ? sub.name : '?';
                shortageHtml += `
                    <div class="alert-card" style="border-left: 4px solid #ef4444; background: #fff5f5;">
                        <div class="alert-info">
                            <h4 style="color: #b91c1c;">${main ? main.name : 'Unknown'} ${size}</h4>
                            <p>${item.length}ft / ${item.weight}KG</p>
                            <p style="font-size: 0.8rem; color: #7f1d1d;">In Stock: ${item.stock} | Required: ${required}</p>
                        </div>
                        <div class="alert-qty" style="background: #ef4444; color: white;">${shortfall}</div>
                    </div>
                `;
            });
        }
    }
    document.getElementById('negativeStockContainer').innerHTML = shortageHtml;
}

function renderAdvancedCharts(brandData) {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded yet.');
        return;
    }

    const labels = brandData.map(d => d.name);
    const stocks = brandData.map(d => d.stock);
    const colors = brandData.map(d => d.color);

    // Bar Chart
    const ctxBar = document.getElementById('barChart');
    if (ctxBar) {
        if (myBarChart) myBarChart.destroy();
        myBarChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pieces (PCS)',
                    data: stocks,
                    backgroundColor: colors.map(c => c + 'CC'), // 80% opacity
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Donut Chart
    const ctxDonut = document.getElementById('donutChart');
    if (ctxDonut) {
        if (myDonutChart) myDonutChart.destroy();
        myDonutChart = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: stocks,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20 } }
                },
                cutout: '65%'
            }
        });
    }
}

function refreshStockList() {
    const search = (document.getElementById('stockSearch')?.value || '').toLowerCase();
    const fromDate = document.getElementById('stockDateFrom')?.value;
    const toDate = document.getElementById('stockDateTo')?.value;

    let orderedQtys = {};
    orders.filter(o => {
        const s = (o.status || '').toLowerCase();
        const isPending = s === 'pending' || s === 'processing';
        const inDateRange = (!fromDate || new Date(o.date) >= new Date(fromDate)) &&
                           (!toDate || new Date(o.date) <= new Date(toDate));
        return isPending && inDateRange;
    }).forEach(order => {
        (order.items || []).forEach(item => {
            orderedQtys[item.itemId] = (orderedQtys[item.itemId] || 0) + (parseInt(item.quantity) || 0);
        });
    });

    let brandCardsHtml = '';
    sortMainCategories(mainCategories).forEach(main => {
        const brandMatches = main.name.toLowerCase().includes(search);
        let brandItems = items.filter(i => i.mainId == main.id);
        let totalBrandStock = 0;
        let totalKg = 0;
        let totalInOrder = 0;

        let itemsHtml = '<table class="data-table" style="margin: 0; width: 100%; border-collapse: collapse; font-size: 0.95rem;">';
        itemsHtml += '<thead><tr>';
        itemsHtml += '<th style="padding: 0.8rem; border-bottom: 2px solid var(--gray-300); background: var(--gray-100);">Size</th>';
        itemsHtml += '<th style="padding: 0.8rem; border-bottom: 2px solid var(--gray-300); background: var(--gray-100);">Description</th>';
        itemsHtml += '<th style="padding: 0.8rem; border-bottom: 2px solid var(--gray-300); background: var(--gray-100); text-align: center;">Length</th>';
        itemsHtml += '<th style="padding: 0.8rem; border-bottom: 2px solid var(--gray-300); background: var(--gray-100); text-align: center;">Available</th>';
        itemsHtml += '<th style="padding: 0.8rem; border-bottom: 2px solid var(--gray-300); background: var(--gray-100); text-align: center;">In Order</th>';
        itemsHtml += '<th style="padding: 0.8rem; border-bottom: 2px solid var(--gray-300); background: var(--gray-100); text-align: center;">Result</th>';
        itemsHtml += '</tr></thead><tbody>';

        let hasVisibleItems = false;
        sortItems(brandItems).forEach(item => {
            let sub = subCategories.find(s => s.id == item.subId);
            let sizeName = sub ? sub.name.replace(/[^0-9.]/g, '') : '?';
            
            // Smart Search logic (e.g. "2m" matches 2" and Brand starting with M)
            const itemKey = (sizeName + main.name.charAt(0)).toLowerCase();
            const fullMatch = (main.name + " " + sizeName).toLowerCase();
            const isMatch = search === '' || brandMatches || sizeName.includes(search) || itemKey.includes(search) || fullMatch.includes(search);

            if (!isMatch) return;
            hasVisibleItems = true;

            let weightVal = parseFloat(item.weight) || 0;
            let desc = `${sizeName}"( ${weightVal.toFixed(1)} ) Kg`;
            let available = item.stock || 0;
            let inOrder = orderedQtys[item.id] || 0;
            let result = available - inOrder;

            totalBrandStock += available;
            totalKg += available * (item.weight || 0);
            totalInOrder += inOrder;

            let resColor = result === 0 ? 'var(--gray-500)' : (result < 0 ? '#ef4444' : 'var(--green-600)');
            let ioColor = inOrder === 0 ? 'var(--gray-500)' : '#dc2626';

            itemsHtml += `
                        <tr style="background: white;">
                            <td style="padding: 0.8rem; border-bottom: 1px solid var(--gray-200);"><strong>${sizeName}"</strong></td>
                            <td style="padding: 0.8rem; border-bottom: 1px solid var(--gray-200); color: var(--gray-700);">${desc}</td>
                            <td style="padding: 0.8rem; border-bottom: 1px solid var(--gray-200); text-align:center;">${item.length} ft</td>
                            <td style="padding: 0.8rem; border-bottom: 1px solid var(--gray-200); text-align:center; font-weight:600; color:var(--orange-500);">${available}</td>
                            <td style="padding: 0.8rem; border-bottom: 1px solid var(--gray-200); text-align:center; font-weight:600; color:${ioColor};">${inOrder}</td>
                            <td style="padding: 0.8rem; border-bottom: 1px solid var(--gray-200); text-align:center; font-weight:700; color:${resColor};">${result}</td>
                        </tr>
                    `;
        });

        itemsHtml += '</tbody></table>';

        if (hasVisibleItems) {
            let totalResult = totalBrandStock - totalInOrder;
            brandCardsHtml += `
                        <div class="brand-card expanded" id="stockCard_${main.id}">
                            <div class="brand-header" style="background: ${main.color};" onclick="toggleBrandCard(document.getElementById('stockCard_${main.id}'))">
                                <h4>${main.name}</h4>
                                <span class="brand-total">Total: ${totalBrandStock} | Order: ${totalInOrder} | Res: ${totalResult}</span>
                            </div>
                            <div class="brand-body" style="padding:0;">
                                ${itemsHtml}
                            </div>
                        </div>
                    `;
        }
    });

    const listContainer = document.getElementById('stockListCards');
    if (listContainer) {
        listContainer.innerHTML = brandCardsHtml || '<div style="text-align:center; padding:3rem; color:var(--gray-500);">No items match your search or date range.</div>';
    }
}

function clearStockFilters() {
    document.getElementById('stockSearch').value = '';
    document.getElementById('stockDateFrom').value = '';
    document.getElementById('stockDateTo').value = '';
    refreshStockList();
}

function refreshAuditList() {
    const search = (document.getElementById('auditSearch')?.value || '').toLowerCase();
    const fromDate = document.getElementById('auditDateFrom')?.value;
    const toDate = document.getElementById('auditDateTo')?.value;
    const auditPrintDate = document.getElementById('auditPrintDate');
    if (auditPrintDate) auditPrintDate.textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    
    let html = '';
    sortMainCategories(mainCategories).forEach(main => {
        let brandItems = items.filter(i => i.mainId == main.id);
        const brandMatches = main.name.toLowerCase().includes(search);
        
        // Group items by size
        let sizeGroups = {};
        brandItems.forEach(item => {
            let sub = subCategories.find(s => s.id == item.subId);
            let sizeName = sub ? sub.name.replace(/[^0-9.]/g, '') : '?';
            const isMatch = search === '' || brandMatches || sizeName.includes(search);
            if (!isMatch) return;

            if (!sizeGroups[sizeName]) sizeGroups[sizeName] = [];
            sizeGroups[sizeName].push(item);
        });

        let rowsHtml = '';
        let bSysPcs = 0, bSysKg = 0;
        
        // Sort sizes numerically
        const sortedSizes = Object.keys(sizeGroups).sort((a, b) => parseFloat(a) - parseFloat(b));

        sortedSizes.forEach(sizeName => {
            const group = sortItems(sizeGroups[sizeName]);
            group.forEach((item, index) => {
                let weightVal = parseFloat(item.weight) || 0;
                let systemPcs = parseInt(item.stock) || 0;
                let effectivePcs = systemPcs; // Use live system stock as Available Stock
                let systemKg = (effectivePcs * weightVal).toFixed(2);
                
                // Load from persistence
                let godownPcs = auditSession[item.id] || "";
                let weightValNum = parseFloat(weightVal);
                let godownKg = (parseInt(godownPcs) || 0) * weightValNum;
                let diffPcs = (parseInt(godownPcs) || 0) - effectivePcs;
                let diffKg = (diffPcs * weightValNum).toFixed(2);
                let diffClass = diffPcs === 0 ? '' : (diffPcs > 0 ? 'diff-plus' : 'diff-minus');
                
                bSysPcs += effectivePcs;
                bSysKg += parseFloat(systemKg);

                // Add bold border class to last row of group
                let rowClass = (index === group.length - 1) ? 'group-row-end' : '';
                // Since Size cell uses rowspan, it belongs to the FIRST row of the group.
                // We must apply the bold border to its bottom if it's the last row of its group (handled by class if it was single row, but here it's indexed)
                // Actually, the rowspan cell inherently spans multiple rows, its bottom coincides with the last row's bottom.
                // In CSS, apply border-bottom to the rowspan cell specifically.

                rowsHtml += `
                    <tr id="auditRow_${item.id}" data-unit-weight="${weightVal}" data-brand-id="${main.id}" class="${rowClass}">
                        ${index === 0 ? `<td rowspan="${group.length}" class="group-row-end" style="font-weight:700; background: var(--gray-50); font-size: 1.1rem; border-right: 2px solid var(--gray-300);">${sizeName}"</td>` : ''}
                        <td>${weightVal.toFixed(2)} KG</td>
                        <td style="text-align:center;">${item.length} ft</td>
                        <td style="color:${main.color}; font-weight:600;">${main.name}</td>
                        <td id="auditSysPcs_${item.id}" class="sys-pcs-val">${effectivePcs}</td>
                        <td id="auditSysKg_${item.id}" class="sys-kg-val">${systemKg}</td>
                        <td>
                            <input type="number" step="1" class="godown-input audit-input-${main.id}" 
                                   placeholder="0"
                                   value="${godownPcs}"
                                   oninput="calculateAuditRow(${item.id}, ${weightVal}, ${main.id})" 
                                   id="auditGodownPcs_${item.id}">
                        </td>
                        <td id="auditGodownKg_${item.id}" class="godown-kg-val">${godownKg.toFixed(2)}</td>
                        <td id="auditDiffPcs_${item.id}" class="diff-pcs-val ${diffClass}">${(diffPcs > 0 ? '+' : '') + diffPcs}</td>
                        <td id="auditDiffKg_${item.id}" class="diff-kg-val ${diffClass}">${(diffPcs > 0 ? '+' : '') + diffKg}</td>
                        <td class="no-print">
                            <button class="btn btn-primary btn-sm" onclick="adjustStockToSystem(${item.id})" title="Adjust system stock to match manual count">Adjust</button>
                        </td>
                    </tr>
                `;
            });
        });

        if (rowsHtml) {
            html += `
                <div class="audit-group" style="margin-bottom: 2rem;">
                    <div class="audit-brand-header" style="background:${main.color};">
                        <span>${main.name} Audit</span>
                        <span style="font-size:0.85rem; font-weight:400;">Total Sizes: ${sortedSizes.length}</span>
                    </div>
                    <table class="audit-table">
                        <thead>
                            <tr>
                                <th rowspan="2">Size</th>
                                <th rowspan="2">KG/Pcs</th>
                                <th rowspan="2">Length</th>
                                <th rowspan="2">Brand</th>
                                <th colspan="2" style="background: var(--sky-50);">Result Stock (System)</th>
                                <th colspan="2" style="background: var(--orange-50);">Godown Stock (Manual)</th>
                                <th colspan="2" style="background: var(--green-50);">Difference</th>
                                <th rowspan="2" class="no-print">Action</th>
                            </tr>
                            <tr>
                                <th style="background: var(--sky-50);">Pieces</th>
                                <th style="background: var(--sky-50);">KG</th>
                                <th style="background: var(--orange-50);">Pieces</th>
                                <th style="background: var(--orange-50);">KG</th>
                                <th style="background: var(--green-50);">Pcs +/-</th>
                                <th style="background: var(--green-50);">KG +/-</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                        <tfoot>
                            <tr style="background: var(--gray-100); font-weight: 800;">
                                <td colspan="4" style="text-align: right; padding-right: 1.5rem;">${main.name} TOTAL:</td>
                                <td id="totalSysPcs_${main.id}">${bSysPcs}</td>
                                <td id="totalSysKg_${main.id}">${bSysKg.toFixed(2)}</td>
                                <td id="totalGodownPcs_${main.id}">0</td>
                                <td id="totalGodownKg_${main.id}">0.00</td>
                                <td id="totalDiffPcs_${main.id}">0</td>
                                <td id="totalDiffKg_${main.id}">0.00</td>
                                <td class="no-print"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        }
    });

    // Add Grand Total Summary at the bottom
    html += `
        <div id="grandTotalContainer" style="margin-top: 3rem; background: var(--gray-50); padding: 2rem; border-radius: 12px; border: 2px solid var(--gray-300);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 2px solid var(--gray-300); padding-bottom: 0.5rem;">
                <h2 style="margin: 0; color: var(--gray-800);">🏆 Audit Grand Summary</h2>
                <span style="font-size: 0.9rem; color: var(--gray-500);">All Brands Combined</span>
            </div>
            <table class="audit-table" style="margin-bottom: 0;">
                <thead>
                    <tr style="background: var(--gray-800); color: white;">
                        <th style="color: white; padding: 1rem;">Metric</th>
                        <th style="color: white; padding: 1rem;">System Stock</th>
                        <th style="color: white; padding: 1rem;">Godown Stock</th>
                        <th style="color: white; padding: 1rem;">Difference</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="font-size: 1.1rem; font-weight: 700;">
                        <td style="background: var(--gray-100);">Total Pieces</td>
                        <td id="grandTotalSysPcs">0</td>
                        <td id="grandTotalGodownPcs" style="color: var(--sky-600);">0</td>
                        <td id="grandTotalDiffPcs">0</td>
                    </tr>
                    <tr style="font-size: 1.1rem; font-weight: 700;">
                        <td style="background: var(--gray-100);">Total Weight (KG)</td>
                        <td id="grandTotalSysKg">0.00</td>
                        <td id="grandTotalGodownKg" style="color: var(--sky-600);">0.00</td>
                        <td id="grandTotalDiffKg">0.00</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    const auditContainer = document.getElementById('auditListContainer');

    if (auditContainer) {
        auditContainer.innerHTML = html || '<p style="text-align:center; padding:3rem; color:var(--gray-500);">No brands or sizes found.</p>';
        
        // Safety: Initialize totals for visible brands only
        sortMainCategories(mainCategories).forEach(m => {
            const hasInput = document.querySelector(`.audit-input-${m.id}`);
            if (hasInput) updateBrandAuditTotals(m.id);
        });
        updateGrandAuditTotal();
    }
}

function calculateAuditRow(itemId, unitWeight, brandId) {
    const sysPcs = parseInt(document.getElementById(`auditSysPcs_${itemId}`).textContent) || 0;
    const godownPcsInput = document.getElementById(`auditGodownPcs_${itemId}`);
    const godownPcsStr = godownPcsInput.value;
    const godownPcs = parseInt(godownPcsStr) || 0;
    
    // Auto KG Calculation
    const godownKg = (godownPcs * unitWeight).toFixed(2);
    document.getElementById(`auditGodownKg_${itemId}`).textContent = godownKg;
    
    // Difference Calculation
    const diffPcs = godownPcs - sysPcs;
    const diffKg = (diffPcs * unitWeight).toFixed(2);
    
    const diffPcsEl = document.getElementById(`auditDiffPcs_${itemId}`);
    const diffKgEl = document.getElementById(`auditDiffKg_${itemId}`);
    
    // Save to persistence
    auditSession[itemId] = godownPcsStr;
    localStorage.setItem('stock_auditSession', JSON.stringify(auditSession));
    
    diffPcsEl.textContent = (diffPcs > 0 ? '+' : '') + diffPcs;
    diffKgEl.textContent = (diffPcs > 0 ? '+' : '') + diffKg;
    
    // Color coding
    diffPcsEl.className = diffPcs === 0 ? 'diff-pcs-val' : (diffPcs > 0 ? 'diff-pcs-val diff-plus' : 'diff-pcs-val diff-minus');
    diffKgEl.className = diffPcs === 0 ? 'diff-kg-val' : (diffPcs > 0 ? 'diff-kg-val diff-plus' : 'diff-kg-val diff-minus');

    // Update Brand Sub-totals
    updateBrandAuditTotals(brandId);
    updateGrandAuditTotal();
}

function updateBrandAuditTotals(brandId) {
    const brandGroup = document.querySelector(`.audit-input-${brandId}`)?.closest('.audit-group');
    if (!brandGroup) return;

    let sysTotalPcs = 0, sysTotalKg = 0;
    let godownTotalPcs = 0, godownTotalKg = 0;
    let diffTotalPcs = 0, diffTotalKg = 0;

    brandGroup.querySelectorAll('tbody tr').forEach(row => {
        const itemId = row.id.split('_')[1];
        const sysPcsEl = document.getElementById(`auditSysPcs_${itemId}`);
        const sysKgEl = document.getElementById(`auditSysKg_${itemId}`);
        const gdPcsEl = document.getElementById(`auditGodownPcs_${itemId}`);
        const gdKgEl = document.getElementById(`auditGodownKg_${itemId}`);
        const dPcsEl = document.getElementById(`auditDiffPcs_${itemId}`);
        const dKgEl = document.getElementById(`auditDiffKg_${itemId}`);

        if (sysPcsEl && gdPcsEl) {
            sysTotalPcs += parseInt(sysPcsEl.textContent) || 0;
            sysTotalKg += parseFloat(sysKgEl.textContent) || 0;
            godownTotalPcs += parseInt(gdPcsEl.value) || 0;
            godownTotalKg += parseFloat(gdKgEl.textContent) || 0;
            
            let dPcs = parseInt(dPcsEl.textContent.replace('+', '')) || 0;
            let dKg = parseFloat(dKgEl.textContent.replace('+', '')) || 0;
            diffTotalPcs += dPcs;
            diffTotalKg += dKg;
        }
    });

    const totSysPcs = document.getElementById(`totalSysPcs_${brandId}`);
    const totSysKg = document.getElementById(`totalSysKg_${brandId}`);
    const totGdPcs = document.getElementById(`totalGodownPcs_${brandId}`);
    const totGdKg = document.getElementById(`totalGodownKg_${brandId}`);
    const totDiffPcs = document.getElementById(`totalDiffPcs_${brandId}`);
    const totDiffKg = document.getElementById(`totalDiffKg_${brandId}`);

    if (totSysPcs) totSysPcs.textContent = sysTotalPcs;
    if (totSysKg) totSysKg.textContent = sysTotalKg.toFixed(2);
    if (totGdPcs) totGdPcs.textContent = godownTotalPcs;
    if (totGdKg) totGdKg.textContent = godownTotalKg.toFixed(2);
    
    if (totDiffPcs) {
        totDiffPcs.textContent = (diffTotalPcs > 0 ? '+' : '') + diffTotalPcs;
        totDiffPcs.className = diffTotalPcs === 0 ? '' : (diffTotalPcs > 0 ? 'diff-plus' : 'diff-minus');
    }
    if (totDiffKg) {
        totDiffKg.textContent = (diffTotalKg > 0 ? '+' : '') + diffTotalKg.toFixed(2);
        totDiffKg.className = diffTotalKg === 0 ? '' : (diffTotalKg > 0 ? 'diff-plus' : 'diff-minus');
    }
}

async function saveMonthlyAudit() {
    const inputs = document.querySelectorAll('.godown-input');
    let itemsToUpdate = [];
    let auditRecords = [];

    inputs.forEach(input => {
        const val = input.value.trim();
        if (val !== "" && val !== "0") {
            const itemId = parseInt(input.id.replace('auditGodownPcs_', ''));
            const newStock = parseInt(val) || 0;
            const sysStock = parseInt(document.getElementById(`auditSysPcs_${itemId}`).textContent) || 0;
            
            itemsToUpdate.push({ id: itemId, stock: newStock });
            auditRecords.push({
                itemId: itemId,
                systemQty: sysStock,
                godownQty: newStock,
                diffQty: newStock - sysStock
            });
        }
    });

    if (itemsToUpdate.length === 0) {
        alert('No godown counts entered to save.');
        return;
    }

    if (!confirm(`Are you sure you want to Save Audit and Update SQL for ${itemsToUpdate.length} items?`)) {
        return;
    }

    // Save to SQL
    try {
        const response = await fetch('api/sync.php?action=save_audit', {
            method: 'POST',
            body: JSON.stringify({ records: auditRecords })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            saveData(); // Sync local (backup)
            alert(`✅ Audit saved as a report!\nLive system stock was NOT changed.`);
            refreshAuditList();
        } else {
            alert('Error saving audit: ' + result.message);
        }
    } catch (e) {
        console.error('Audit save failed:', e);
        alert('Server connection failed. Audit not saved.');
    }
}

function verifyAdminAction() {
    const code = prompt("Please enter Admin Code to proceed:");
    // Check against admin user's password or a preferred hardcoded code
    const adminUser = users.find(u => u.username === 'admin');
    const validCode = (adminUser ? adminUser.password : 'admin123');
    
    if (code === validCode) {
        return true;
    } else {
        alert("❌ Invalid Admin Code. Action cancelled.");
        return false;
    }
}

async function adjustStockToSystem(itemId) {
    if (!verifyAdminAction()) return;
    
    const sysPcsEl = document.getElementById(`auditSysPcs_${itemId}`);
    const diffPcsEl = document.getElementById(`auditDiffPcs_${itemId}`);
    if (!sysPcsEl || !diffPcsEl) return;

    const diff = parseInt(diffPcsEl.textContent.replace('+', '')) || 0;
    if (diff === 0) {
        alert('Stock is already synchronized.');
        return;
    }

    if (!confirm(`Adjust system stock by ${diff > 0 ? '+' : ''}${diff} pcs to synchronize with manual count?`)) return;

    try {
        const response = await fetch('api/sync.php?action=adjust_stock', {
            method: 'POST',
            body: JSON.stringify({ adjustment: { itemId: itemId, diff: diff, notes: 'Manual Audit Adjustment' } })
        });
        const result = await response.json();
        if (result.status === 'success') {
            // Update local memory
            const item = items.find(i => i.id == itemId);
            if (item) item.stock = parseInt(item.stock) + diff;
            saveData();
            alert('✅ Stock adjusted successfully!');
            refreshAuditList();
        } else {
            alert('Error adjusting stock: ' + result.message);
        }
    } catch (e) {
        console.error('Adjustment failed:', e);
        alert('Server connection failed.');
    }
}

async function adjustAllStockToSystem() {
    if (!verifyAdminAction()) return;
    
    const rows = document.querySelectorAll('tbody tr[id^="auditRow_"]');
    let adjustments = [];

    rows.forEach(row => {
        const itemId = parseInt(row.id.replace('auditRow_', ''));
        const diffEl = document.getElementById(`auditDiffPcs_${itemId}`);
        const diff = parseInt(diffEl?.textContent.replace('+', '')) || 0;
        
        if (diff !== 0) {
            adjustments.push({ itemId: itemId, diff: diff, notes: 'Bulk Audit Adjustment' });
        }
    });

    if (adjustments.length === 0) {
        alert('All items are already synchronized.');
        return;
    }

    if (!confirm(`Are you sure you want to adjust system stock for ${adjustments.length} items to match manual counts?`)) return;

    try {
        const response = await fetch('api/sync.php?action=bulk_adjust_stock', {
            method: 'POST',
            body: JSON.stringify({ adjustments: adjustments })
        });
        const result = await response.json();
        if (result.status === 'success') {
            // Update local memory
            adjustments.forEach(adj => {
                const item = items.find(i => i.id == adj.itemId);
                if (item) item.stock = parseInt(item.stock) + adj.diff;
            });
            saveData();
            alert(`✅ Successfully adjusted ${adjustments.length} items!`);
            refreshAuditList();
        } else {
            alert('Error during bulk adjustment: ' + result.message);
        }
    } catch (e) {
        console.error('Bulk adjustment failed:', e);
        alert('Server connection failed.');
    }
}

async function resetAuditSession() {
    if (confirm('Clear ALL Godown Stock manual entries? This cannot be undone.')) {
        try {
            const response = await fetch('api/sync.php?action=clear_audit', {
                method: 'POST'
            });
            const result = await response.json();
            if (result.status === 'success') {
                auditSession = {};
                localStorage.removeItem('stock_auditSession');
                refreshAuditList();
            } else {
                alert('Failed to clear data on server: ' + (result.message || 'Unknown error'));
            }
        } catch (e) {
            console.error('Reset Audit Error:', e);
            alert('Connection failed. Could not clear server data.');
        }
    }
}

function clearAuditFilters() {
    if (document.getElementById('auditSearch')) document.getElementById('auditSearch').value = '';
    if (document.getElementById('auditDateFrom')) document.getElementById('auditDateFrom').value = '';
    if (document.getElementById('auditDateTo')) document.getElementById('auditDateTo').value = '';
    refreshAuditList();
}

// ==================== REPORTS ARCHIVE FUNCTIONS ====================
async function archiveCurrentAudit() {
    const reportTitle = prompt("Enter a title for this report (e.g., April 2026 Audit):", `Audit Report ${new Date().toLocaleDateString()}`);
    if (!reportTitle) return;

    // Collect all data currently shown in the audit list
    // We iterate through all main categories and their items
    const snapshotData = [];
    
    // We need to use the current items list, grouped by brand
    mainCategories.forEach(brand => {
        const brandItems = items.filter(i => i.mainId === brand.id);
        if (brandItems.length === 0) return;

        const brandGroup = {
            brandName: brand.name,
            items: []
        };

        brandItems.forEach(item => {
            const sub = subCategories.find(s => s.id === item.subId);
            const godownQty = auditSession[item.id] || "0";
            const diff = (parseInt(godownQty) || 0) - (parseInt(item.stock) || 0);

            brandGroup.items.push({
                productCode: getProductCode(item, brand, sub),
                size: sub ? sub.name : 'N/A',
                systemQty: item.stock,
                godownQty: godownQty,
                diff: diff
            });
        });
        snapshotData.push(brandGroup);
    });

    if (snapshotData.length === 0) {
        alert("No data to archive.");
        return;
    }

    try {
        const response = await fetch('api/sync.php?action=archive_report', {
            method: 'POST',
            body: JSON.stringify({
                title: reportTitle,
                data: snapshotData,
                report_type: 'FG'
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert("✅ Report archived successfully!");
            if (typeof refreshArchivedReportsList === 'function') refreshArchivedReportsList();
        } else {
            alert("❌ Failed to archive: " + result.message);
        }
    } catch (e) {
        console.error(e);
        alert("Connection error while archiving.");
    }
}

let currentArchivedReport = null; // Currently viewed report data

async function refreshArchivedReportsList() {
    try {
        const response = await fetch(`api/sync.php?action=get_all&v=${Date.now()}`);
        const result = await response.json();
        if (result.status === 'success') {
            archivedReports = result.data.archivedReports || [];
            const tbody = document.getElementById('archivedReportsBody');
            
            const fgRows = archivedReports.filter(r => (r.report_type || 'FG') === 'FG').map(r => `
                <tr>
                    <td style="padding: 1.2rem; font-weight: 600; color: var(--gray-800);">${r.title}</td>
                    <td style="padding: 1.2rem; color: var(--gray-500);">${new Date(r.date).toLocaleString()}</td>
                    <td style="padding: 1.2rem; display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="report-action-btn" onclick="viewArchivedReport(${r.id})">👁️ View</button>
                        <button class="report-action-btn delete" onclick="deleteArchivedReport(${r.id})">🗑️ Delete</button>
                    </td>
                </tr>`).join('');
            
            const rmRows = archivedReports.filter(r => r.report_type === 'RM').map(r => `
                <tr>
                    <td style="padding: 1.2rem; font-weight: 600; color: var(--gray-800);">${r.title}</td>
                    <td style="padding: 1.2rem; color: var(--gray-500);">${new Date(r.date).toLocaleString()}</td>
                    <td style="padding: 1.2rem; display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="report-action-btn" onclick="viewArchivedReport(${r.id})">👁️ View</button>
                        <button class="report-action-btn delete" onclick="deleteArchivedReport(${r.id})">🗑️ Delete</button>
                    </td>
                </tr>`).join('');

            if (tbody) tbody.innerHTML = fgRows || `<tr><td colspan="3" style="text-align: center; padding: 3rem; color: var(--gray-400);">No Finish Good reports found.</td></tr>`;
            
            // Also populate RM Reports Table if it exists
            const rmTable = document.getElementById('rmReportsTable');
            if (rmTable) rmTable.innerHTML = rmRows || `<tr><td colspan="4" style="text-align: center; padding: 3rem; color: var(--gray-400);">No Raw Material reports found.</td></tr>`;
        }
    } catch (e) { console.error(e); }
}

async function viewArchivedReport(id) {
    try {
        const response = await fetch(`api/sync.php?action=get_archived_report&id=${id}`);
        const result = await response.json();
        if (result.status === 'success' && result.report) {
            currentArchivedReport = result.report;
            currentArchivedReport.snapshot = JSON.parse(result.report.data);
            
            document.getElementById('reportViewerTitle').textContent = currentArchivedReport.title;
            renderArchivedContent(currentArchivedReport.snapshot, currentArchivedReport.report_type);
            document.getElementById('reportViewerModal').style.display = 'block';
        }
    } catch (e) { 
        console.error(e);
        alert("Failed to load report details."); 
    }
}

function renderArchivedContent(data, type = 'FG') {
    let html = '';
    
    if (type === 'RM') {
        html = `
            <table class="audit-table" style="width: 100%; border-collapse: collapse; background: white; border: 1px solid var(--gray-200);">
                <thead>
                    <tr style="background: var(--gray-50);">
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Material Name</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Code</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">System Stock</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Physical Stock</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Difference</th>
                    </tr>
                </thead>
                <tbody>`;
        data.forEach(item => {
            const diff = parseFloat(item.difference) || 0;
            const diffClass = diff > 0 ? 'diff-plus' : (diff < 0 ? 'diff-minus' : '');
            const diffText = diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
            html += `<tr>
                <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: left; font-weight:600;">${item.name}</td>
                <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center; color:var(--gray-500); font-family:monospace;">${item.code}</td>
                <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center;">${parseFloat(item.system).toFixed(2)} ${item.unit}</td>
                <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center;"><strong>${parseFloat(item.physical).toFixed(2)}</strong> ${item.unit}</td>
                <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center;" class="${diffClass}">${diffText}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
    } else {
        // Finish Goods Clustered View
        data.forEach(group => {
            html += `<div class="audit-group" style="margin-bottom: 2rem;">
                <div class="audit-brand-header" style="background: var(--sky-600); color: white; padding: 0.8rem 1.2rem; border-radius: 8px 8px 0 0; font-weight: 600;">
                    ${group.brandName}
                </div>
                <table class="audit-table" style="width: 100%; border-collapse: collapse; background: white; border: 1px solid var(--gray-200);">
                    <thead>
                        <tr style="background: var(--gray-50);">
                            <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Code</th>
                            <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Size</th>
                            <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">System Qty</th>
                            <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Godown Qty</th>
                            <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Difference</th>
                        </tr>
                    </thead>
                    <tbody>`;
            (group.items || []).forEach(item => {
                const diffClass = item.diff > 0 ? 'diff-plus' : (item.diff < 0 ? 'diff-minus' : '');
                const diffText = item.diff > 0 ? `+${item.diff}` : item.diff;
                html += `<tr>
                    <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center;">${item.productCode}</td>
                    <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center;">${item.size}</td>
                    <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center;">${item.systemQty}</td>
                    <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center;"><strong>${item.godownQty}</strong></td>
                    <td style="padding: 0.6rem; border: 1px solid var(--gray-200); text-align: center;" class="${diffClass}">${diffText}</td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        });

        // Totals for FG only
        let gSysPcs = 0, gGdPcs = 0;
        data.forEach(group => {
            (group.items || []).forEach(item => {
                gSysPcs += parseInt(item.systemQty) || 0;
                gGdPcs += parseInt(item.godownQty) || 0;
            });
        });

        html += `<div style="background: var(--gray-100); padding: 1rem; border-radius: 8px; display: flex; gap: 2rem; font-weight: 700;">
            <span>Total System: ${gSysPcs.toLocaleString()} Pcs</span>
            <span>Total Godown: ${gGdPcs.toLocaleString()} Pcs</span>
            <span>Net Variance: ${(gGdPcs - gSysPcs).toLocaleString()} Pcs</span>
        </div>`;
    }

    document.getElementById('archivedReportContent').innerHTML = html;
}

function closeReportViewer() {
    document.getElementById('reportViewerModal').style.display = 'none';
}

async function deleteArchivedReport(id) {
    if (!confirm("Are you sure you want to delete this archived report?")) return;
    try {
        const response = await fetch('api/sync.php?action=delete_archived_report', {
            method: 'POST',
            body: JSON.stringify({ id: id })
        });
        const result = await response.json();
        if (result.status === 'success') {
            refreshArchivedReportsList();
        }
    } catch (e) { alert("Failed to delete report."); }
}

function printArchivedReport() {
    window.print();
}

function exportArchivedToExcel() {
    if (!currentArchivedReport) return;
    const flatData = [];
    currentArchivedReport.snapshot.forEach(group => {
        group.items.forEach(item => {
            flatData.push({
                "Brand": group.brandName,
                "Code": item.productCode,
                "Size": item.size,
                "System Qty": item.systemQty,
                "Godown Qty": item.godownQty,
                "Difference": item.diff
            });
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Archived Audit");
    XLSX.writeFile(workbook, `${currentArchivedReport.title.replace(/\s+/g, '_')}.xlsx`);
}

function exportArchivedToPdf() {
    if (!currentArchivedReport) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(2, 132, 199);
    doc.text(currentArchivedReport.title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Saved Date: ${new Date(currentArchivedReport.date).toLocaleString()}`, 14, 30);

    const flatData = [];
    currentArchivedReport.snapshot.forEach(group => {
        group.items.forEach(item => {
            flatData.push([
                group.brandName,
                item.productCode,
                item.size,
                item.systemQty,
                item.godownQty,
                item.diff
            ]);
        });
    });

    doc.autoTable({
        head: [["Brand", "Code", "Size", "System", "Godown", "Diff"]],
        body: flatData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [2, 132, 199] }
    });

    doc.save(`${currentArchivedReport.title.replace(/\s+/g, '_')}.pdf`);
}

function refreshLowStockReport() {
    // Group low stock items by brand
    let lowByBrand = {};
    items.forEach(item => {
        let main = mainCategories.find(m => m.id === item.mainId);
        let min = item.lowStockLimit || main?.lowStockLimit || 10;
        if (parseInt(item.stock) <= parseInt(min)) {
            const brandId = main ? main.id : 'unknown';
            const brandName = main ? main.name : 'Unknown Brand';
            const brandColor = main ? main.color : '#ccc';

            if (!lowByBrand[brandId]) {
                lowByBrand[brandId] = {
                    name: brandName,
                    color: brandColor,
                    items: []
                };
            }
            lowByBrand[brandId].items.push(item);
        }
    });

    let lowCardsHtml = '';
    if (Object.keys(lowByBrand).length === 0) {
        lowCardsHtml = '<p style="text-align:center; color:var(--green-600);">✅ All items have sufficient stock</p>';
    } else {
        for (let brandId in lowByBrand) {
            let brand = lowByBrand[brandId];
            let itemsHtml = '';
            brand.items.forEach(item => {
                let sub = subCategories.find(s => s.id === item.subId);
                let main = mainCategories.find(m => m.id === item.mainId);
                let min = item.lowStockLimit || main?.lowStockLimit || 10;
                let stockPercent = (item.stock / min) * 100;
                let status = stockPercent <= 30 ? 'critical' : 'warning';
                let size = sub ? sub.name.replace(/[^0-9.]/g, '') : '?';

                itemsHtml += `
                            <div class="low-item ${status}">
                                <span>${size}" / ${item.length}ft / ${item.weight}KG</span>
                                <span><strong>${item.stock}</strong> / ${min}</span>
                            </div>
                        `;
            });

            lowCardsHtml += `
                        <div class="low-brand-card" id="lowCard_${brandId}">
                            <div class="low-brand-header" onclick="toggleLowBrandCard(document.getElementById('lowCard_${brandId}'))">
                                <h5 style="color:${brand.color};">${brand.name}</h5>
                                <span>${brand.items.length} items</span>
                            </div>
                            <div class="low-brand-body">
                                ${itemsHtml}
                            </div>
                        </div>
                    `;
        }
    }
    document.getElementById('lowStockCards').innerHTML = lowCardsHtml;
}

// Print Functions
function printStockList() {
    const company = companySettings.name || 'StockFlow';
    const logo = companySettings.logo || '📦';
    const date = new Date().toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('printCompanyName').textContent = company;
    const printLogo = document.getElementById('printLogo');
    if (printLogo) printLogo.innerHTML = logo;
    document.getElementById('printDate').textContent = `Report Date: ${date}`;
    window.print();
}

function printLowStock() {
    window.print();
}

// Row Creation Functions
function addProductionRow() {
    const row = document.createElement('div');
    row.className = 'entry-row';
    const brandOptions = mainCategories.map(m => ({ value: m.id, text: m.name }));
    const brandWrapper = createSearchableInput('Brand...', brandOptions, (opt) => {
        row.dataset.brandId = opt.value;
        updateSizeDropdown(row, opt.value, 'production');
    }, false, 'brand');
    const sizeWrapper = createSearchableInput('Size...', [], null, true, null);
    const itemWrapper = createSearchableInput('...', [], null, true, null);

    const lengthInput = document.createElement('select');
    lengthInput.className = 'searchable-input';
    const lengths = [...new Set(companySettings.availableLengths)].sort((a, b) => a - b);
    lengthInput.innerHTML = lengths.map(l => `<option value="${l}">${l}</option>`).join('');
    lengthInput.value = '13';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'searchable-input';
    qtyInput.placeholder = 'Qty';
    qtyInput.min = '1';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '✖';
    removeBtn.onclick = () => row.remove();

    row.appendChild(brandWrapper);
    row.appendChild(sizeWrapper);
    row.appendChild(itemWrapper);
    row.appendChild(lengthInput);
    row.appendChild(qtyInput);
    row.appendChild(removeBtn);

    document.getElementById('productionRows').appendChild(row);
}

function addSaleRow() {
    const row = document.createElement('div');
    row.className = 'entry-row';
    const brandOptions = mainCategories.map(m => ({ value: m.id, text: m.name }));
    const brandWrapper = createSearchableInput('Brand...', brandOptions, (opt) => {
        row.dataset.brandId = opt.value;
        updateSizeDropdown(row, opt.value, 'sale');
    }, false, 'brand');
    const sizeWrapper = createSearchableInput('Size...', [], null, true, null);
    const itemWrapper = createSearchableInput('...', [], null, true, null);

    const lengthInput = document.createElement('select');
    lengthInput.className = 'searchable-input';
    const lengths = [...new Set(companySettings.availableLengths)].sort((a, b) => a - b);
    lengthInput.innerHTML = lengths.map(l => `<option value="${l}">${l}</option>`).join('');
    lengthInput.value = '13';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'searchable-input';
    qtyInput.placeholder = 'Qty';
    qtyInput.min = '1';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '✖';
    removeBtn.onclick = () => row.remove();

    row.appendChild(brandWrapper);
    row.appendChild(sizeWrapper);
    row.appendChild(itemWrapper);
    row.appendChild(lengthInput);
    row.appendChild(qtyInput);
    row.appendChild(removeBtn);

    document.getElementById('saleRows').appendChild(row);
}

function addAdjustmentRow() {
    const row = document.createElement('div');
    row.className = 'entry-row';
    const brandOptions = mainCategories.map(m => ({ value: m.id, text: m.name }));
    const brandWrapper = createSearchableInput('Brand...', brandOptions, (opt) => {
        row.dataset.brandId = opt.value;
        updateSizeDropdown(row, opt.value, 'adjustment');
    }, false, 'brand');
    const sizeWrapper = createSearchableInput('Size...', [], null, true, null);
    const itemWrapper = createSearchableInput('...', [], null, true, null);

    const lengthInput = document.createElement('select');
    lengthInput.className = 'searchable-input';
    const lengths = [...new Set(companySettings.availableLengths)].sort((a, b) => a - b);
    lengthInput.innerHTML = lengths.map(l => `<option value="${l}">${l}</option>`).join('');
    lengthInput.value = '13';

    const typeSelect = document.createElement('select');
    typeSelect.className = 'searchable-input';
    typeSelect.innerHTML = `
                <option value="add">➕ Add</option>
                <option value="remove">➖ Remove</option>
            `;

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'searchable-input';
    qtyInput.placeholder = 'Qty';
    qtyInput.min = '1';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '✖';
    removeBtn.onclick = () => row.remove();

    row.appendChild(brandWrapper);
    row.appendChild(sizeWrapper);
    row.appendChild(itemWrapper);
    row.appendChild(lengthInput);
    row.appendChild(typeSelect);
    row.appendChild(qtyInput);
    row.appendChild(removeBtn);

    document.getElementById('adjustmentRows').appendChild(row);
}

function addNewOrderRow() {
    const row = document.createElement('div');
    row.className = 'entry-row';
    const brandOptions = mainCategories.map(m => ({ value: m.id, text: m.name }));
    const brandWrapper = createSearchableInput('Brand...', brandOptions, (opt) => {
        row.dataset.brandId = opt.value;
        updateSizeDropdown(row, opt.value, 'order');
    }, false, 'brand');
    const sizeWrapper = createSearchableInput('Size...', [], null, true, null);
    const itemWrapper = createSearchableInput('...', [], null, true, null);

    const lengthInput = document.createElement('select');
    lengthInput.className = 'searchable-input';
    const lengths = [...new Set(companySettings.availableLengths)].sort((a, b) => a - b);
    lengthInput.innerHTML = lengths.map(l => `<option value="${l}">${l}</option>`).join('');
    lengthInput.value = '13';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'searchable-input';
    qtyInput.placeholder = 'Qty';
    qtyInput.min = '1';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '✖';
    removeBtn.onclick = () => row.remove();

    row.appendChild(brandWrapper);
    row.appendChild(sizeWrapper);
    row.appendChild(itemWrapper);
    row.appendChild(lengthInput);
    row.appendChild(qtyInput);
    row.appendChild(removeBtn);

    document.getElementById('newOrderRows').appendChild(row);
}

function updateSizeDropdown(row, brandId, type) {
    const sizeWrapper = row.children[1];
    const itemWrapper = row.children[2];
    const sizeOptions = subCategories
        .filter(s => s.mainId == brandId)
        .map(s => ({ value: s.id, text: s.name }));

    const newSizeWrapper = createSearchableInput('Size...', sizeOptions, (opt) => {
        row.dataset.sizeId = opt.value;
        updateItemDropdown(row, brandId, opt.value, type);
    }, false, 'size', brandId);

    row.replaceChild(newSizeWrapper, sizeWrapper);
    const newItemWrapper = createSearchableInput('...', [], null, true, null);
    row.replaceChild(newItemWrapper, itemWrapper);
}

function updateItemDropdown(row, brandId, sizeId, type) {
    const itemWrapper = row.children[2];
    const lengthInput = row.children[3];

    const itemOptions = items
        .filter(i => i.mainId == brandId && i.subId == sizeId)
        .map(i => ({
            value: i.id,
            text: (i.name ? i.name + ' ' : '') + `(${i.length}ft ${i.weight}KG)`,
            stock: i.stock || 0,
            minStock: i.minStock || mainCategories.find(m => m.id === brandId)?.lowStockLimit || 10,
            length: i.length,
            weight: i.weight,
            item: i
        }));

    const newItemWrapper = createSearchableInput('Item...', itemOptions, (opt) => {
        row.dataset.itemId = opt.value;
        row.dataset.itemName = opt.item.name;
        row.dataset.itemWeight = opt.item.weight;
        row.dataset.itemLength = opt.item.length;
        
        let len = parseFloat(opt.item.length);
        if (!companySettings.availableLengths.includes(len)) {
            companySettings.availableLengths.push(len);
            saveLengthSettings();
            updateLengthDropdowns();
        }
        lengthInput.value = len;
    }, false, 'item', { brandId, sizeId });
    row.replaceChild(newItemWrapper, itemWrapper);
}

// Save Functions
function showProductionEntry() {
    hideAllForms();
    document.getElementById('productionForm').style.display = 'block';
    let now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('prodDate').value = now.toISOString().slice(0, 16);
    document.getElementById('productionRows').innerHTML = '';
    addProductionRow();
}

function showSaleEntry() {
    hideAllForms();
    let wrapper = document.getElementById('saleCustomerWrapper');
    wrapper.innerHTML = '';
    let customerIdInput = document.createElement('input');
    customerIdInput.type = 'hidden';
    customerIdInput.id = 'saleCustomerId';
    wrapper.appendChild(customerIdInput);

    let customerSearch = createCustomerSearchable('Search customer...', (cust) => {
        document.getElementById('saleCustomerId').value = cust.id;
    });
    wrapper.appendChild(customerSearch);

    document.getElementById('saleForm').style.display = 'block';
    let now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('saleDate').value = now.toISOString().slice(0, 16);
    document.getElementById('saleRows').innerHTML = '';
    refreshCompletedOrderDropdown();
    addSaleRow();
}

function showAdjustmentEntry() {
    hideAllForms();
    document.getElementById('adjustmentForm').style.display = 'block';
    let now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('adjDate').value = now.toISOString().slice(0, 16);
    document.getElementById('adjustmentRows').innerHTML = '';
    addAdjustmentRow();
}

function showNewOrderForm() {
    let wrapper = document.getElementById('newCustomerWrapper');
    wrapper.innerHTML = '';
    let customerIdInput = document.createElement('input');
    customerIdInput.type = 'hidden';
    customerIdInput.id = 'newCustomerId';
    wrapper.appendChild(customerIdInput);

    let customerSearch = createCustomerSearchable('Search customer...', (cust) => {
        document.getElementById('newCustomerId').value = cust.id;
    });
    wrapper.appendChild(customerSearch);

    document.getElementById('newOrderForm').style.display = 'block';
    let now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('orderDate').value = now.toISOString().slice(0, 16);
    document.getElementById('newOrderRows').innerHTML = '';
    addNewOrderRow();
}

function hideNewOrderForm() {
    document.getElementById('newOrderForm').style.display = 'none';
}

function hideAllForms() {
    document.getElementById('productionForm').style.display = 'none';
    document.getElementById('saleForm').style.display = 'none';
    document.getElementById('adjustmentForm').style.display = 'none';
}

async function saveProduction() {
    const saveBtn = document.getElementById('saveProdBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';
    }

    try {
        let rows = document.getElementById('productionRows').children;
        if (rows.length === 0) { 
            alert('Add at least one item'); 
            return; 
        }
        let errors = [];
        let prodDate = document.getElementById('prodDate').value;

        // Process rows...
        for (let row of rows) {
            const itemId = row.dataset.itemId;
            const lengthInput = row.children[3];
            const qtyInput = row.children[4];
            const qty = parseInt(qtyInput ? qtyInput.value : 0);
            const length = parseInt(lengthInput ? lengthInput.value : 13);

            if (!itemId) { errors.push('Select item'); continue; }
            if (!qty || qty <= 0) { errors.push('Enter quantity'); continue; }
            let item = items.find(i => i.id == itemId);
            if (!item) { errors.push('Item not found'); continue; }

            if (length && length > 0) item.length = length;

            let main = mainCategories.find(m => m.id === item.mainId);
            let sub = subCategories.find(s => s.id === item.subId);

            let tData = {
                type: 'PRODUCTION',
                date: prodDate,
                mainId: item.mainId,
                subId: item.subId,
                itemId: itemId,
                quantity: qty,
                notes: 'Production'
            };

            try {
                const response = await fetch('api/sync.php?action=save_transaction', {
                    method: 'POST',
                    body: JSON.stringify({ transaction: tData })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    item.stock = (item.stock || 0) + qty;
                    transactions.unshift({
                        id: result.id,
                        ...tData,
                        type: 'IN', // Normalize for UI metrics
                        mainName: main ? main.name : '',
                        subName: sub ? sub.name : '',
                        productCode: getProductCode(item, main, sub),
                        itemName: item.name,
                        itemWeight: item.weight,
                        itemLength: item.length,
                        customer: 'Factory'
                    });
                } else {
                    errors.push(`Failed to save ${item.name}: ${result.message}`);
                }
            } catch (e) {
                errors.push(`Server error for ${item.name}`);
            }
        }

        if (errors.length > 0) alert('Errors:\n' + errors.join('\n'));
        
        // Clear Entry Data as requested
        document.getElementById('productionRows').innerHTML = '';
        
        saveData(); 
        refreshTransactions(); 
        refreshDashboard(); 
        refreshStockList(); 
        refreshLowStockReport(); 
        hideAllForms();
        
        // Auto-save consumption snapshot
        await autoSaveRMConsumption();
        alert('ad sucsessfuly');
    } catch (err) {
        console.error('saveProduction Error:', err);
        alert('❌ Note: Production saved to database, but there was a minor local error updating the screen.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Production';
        }
    }
}

async function saveSale() {
    let customerId = document.getElementById('saleCustomerId').value;
    let customer = customers.find(c => c.id == customerId);
    if (!customer) { alert('Select customer'); return; }
    
    let customerName = customer.name + ' (' + customer.uniqueId + ')';
    let rows = document.getElementById('saleRows').children;
    if (rows.length === 0) { alert('Add at least one item'); return; }
    let errors = [];
    let saleDate = document.getElementById('saleDate').value;
    let selectedOrderId = document.getElementById('saleOrderSelect').value;

    for (let row of rows) {
        const itemId = row.dataset.itemId;
        const lengthInput = row.children[3];
        const qtyInput = row.children[4];
        const qty = parseInt(qtyInput ? qtyInput.value : 0);
        const length = parseInt(lengthInput ? lengthInput.value : 13);

        if (!itemId) { errors.push('Select item'); continue; }
        if (!qty || qty <= 0) { errors.push('Enter quantity'); continue; }
        let item = items.find(i => i.id == itemId);
        if (!item) { errors.push('Item not found'); continue; }

        if (length && length > 0) item.length = length;
        if (qty > (item.stock || 0)) {
            errors.push(`Insufficient stock for ${item.name}. Available: ${item.stock}`);
            continue;
        }

        let main = mainCategories.find(m => m.id === item.mainId);
        let sub = subCategories.find(s => s.id === item.subId);

        let tData = {
            type: 'SALE',
            date: saleDate,
            mainId: item.mainId,
            subId: item.subId,
            itemId: itemId,
            quantity: qty,
            customerId: customerId,
            notes: 'Sale'
        };

        try {
            const response = await fetch('api/sync.php?action=save_transaction', {
                method: 'POST',
                body: JSON.stringify({ transaction: tData })
            });
            const result = await response.json();
            if (result.status === 'success') {
                item.stock = (item.stock || 0) - qty;
                transactions.unshift({
                    id: result.id,
                    ...tData,
                    type: 'OUT', // Normalize for UI
                    mainName: main ? main.name : '',
                    subName: sub ? sub.name : '',
                    productCode: getProductCode(item, main, sub),
                    itemName: item.name,
                    itemWeight: item.weight,
                    itemLength: item.length,
                    customer: customerName
                });
            } else {
                errors.push(`Failed to save ${item.name}: ${result.message}`);
            }
        } catch (e) {
            errors.push(`Server error for ${item.name}`);
        }
    }

    if (errors.length > 0) alert('Errors:\n' + errors.join('\n'));
    if (selectedOrderId) {
        let order = orders.find(o => o.id == selectedOrderId);
        if (order) {
            order.isStockSubtracted = 1;
            await fetch('api/sync.php?action=save_order', {
                method: 'POST',
                body: JSON.stringify({ order: order })
            });
        }
    }
    
    saveData(); refreshTransactions(); refreshDashboard(); refreshStockList(); refreshLowStockReport(); hideAllForms(); refreshCompletedOrderDropdown();
    alert('Process complete.');
}

async function saveAdjustment() {
    let rows = document.getElementById('adjustmentRows').children;
    if (rows.length === 0) { alert('Add at least one item'); return; }
    let errors = [];
    let adjDate = document.getElementById('adjDate').value;

    for (let row of rows) {
        const itemId = row.dataset.itemId;
        const lengthInput = row.children[3];
        const typeSelect = row.children[4];
        const type = typeSelect ? typeSelect.value : 'add';
        const qtyInput = row.children[5];
        const qty = parseInt(qtyInput ? qtyInput.value : 0);
        const length = parseInt(lengthInput ? lengthInput.value : 13);

        if (!itemId) { errors.push('Select item'); continue; }
        if (!qty || qty <= 0) { errors.push('Enter quantity'); continue; }
        let item = items.find(i => i.id == itemId);
        if (!item) { errors.push('Item not found'); continue; }

        if (length && length > 0) item.length = length;
        if (type === 'remove' && qty > (item.stock || 0)) {
            errors.push(`Cannot remove ${qty} PCS. Available: ${item.stock}`);
            continue;
        }

        let main = mainCategories.find(m => m.id === item.mainId);
        let sub = subCategories.find(s => s.id === item.subId);
        let finalQty = type === 'add' ? qty : -qty;

        let tData = {
            type: 'ADJUSTMENT',
            date: adjDate,
            mainId: item.mainId,
            subId: item.subId,
            itemId: itemId,
            quantity: finalQty,
            notes: 'Adjustment'
        };

        try {
            const response = await fetch('api/sync.php?action=save_transaction', {
                method: 'POST',
                body: JSON.stringify({ transaction: tData })
            });
            const result = await response.json();
            if (result.status === 'success') {
                item.stock = (item.stock || 0) + finalQty;
                transactions.unshift({
                    id: result.id,
                    ...tData,
                    type: 'ADJ', // Normalize for UI
                    mainName: main ? main.name : '',
                    subName: sub ? sub.name : '',
                    productCode: getProductCode(item, main, sub),
                    itemName: item.name,
                    itemWeight: item.weight,
                    itemLength: item.length,
                    customer: 'Adjustment'
                });
            } else {
                errors.push(`Failed to save ${item.name}: ${result.message}`);
            }
        } catch (e) {
            errors.push(`Server error for ${item.name}`);
        }
    }

    if (errors.length > 0) alert('Errors:\n' + errors.join('\n'));
    saveData(); refreshTransactions(); refreshDashboard(); refreshStockList(); refreshLowStockReport(); hideAllForms();
    alert('Process complete.');
}

async function saveNewOrder() {
    let customerId = document.getElementById('newCustomerId').value;
    let customer = customers.find(c => c.id == customerId);
    if (!customer) { alert('Select customer'); return; }
    
    let customerName = customer.name + ' (' + customer.uniqueId + ')';
    let rows = document.getElementById('newOrderRows').children;
    let orderItems = [];
    let totalQty = 0; let totalKg = 0;
    
    for (let row of rows) {
        const itemId = row.dataset.itemId;
        const lengthInput = row.children[3];
        const qtyInput = row.children[4];
        const qty = parseInt(qtyInput ? qtyInput.value : 0);
        const length = parseInt(lengthInput ? lengthInput.value : 13);

        if (!itemId || !qty || qty <= 0) continue;
        let item = items.find(i => i.id == itemId);
        if (!item) continue;

        if (length && length > 0) item.length = length;

        let main = mainCategories.find(m => m.id === item.mainId);
        let sub = subCategories.find(s => s.id === item.subId);
        orderItems.push({
            itemId: itemId,
            mainId: item.mainId,
            subId: item.subId,
            mainName: main ? main.name : '',
            subName: sub ? sub.name : '',
            productCode: getProductCode(item, main, sub),
            itemName: item.name,
            weight: item.weight,
            length: item.length,
            quantity: qty,
            fulfilled: 0
        });
        totalQty += qty; totalKg += qty * (item.weight || 0);
    }
    if (orderItems.length === 0) { alert('Add at least one item'); return; }

    let orderData = {
        date: document.getElementById('orderDate').value,
        customerId: parseInt(customerId),
        items: orderItems,
        totalQty: totalQty,
        totalKg: totalKg,
        status: 'Pending'
    };

    try {
        let response = await fetch('api/sync.php?action=save_order&t=' + Date.now(), {
            method: 'POST',
            body: JSON.stringify({ order: orderData })
        });
        
        const rawBody = await response.text();
        let result;
        try {
            result = JSON.parse(rawBody);
        } catch (parseErr) {
            alert('Server Error! The server responded with invalid data (Version 6):\n\n' + rawBody.slice(0, 500));
            return;
        }

        if (result.status === 'success') {
            orderData.id = result.id;
            orderData.status = (orderData.status || 'pending').toLowerCase();
            orderData.customerName = customerName;
            orderData.items = orderItems; // Hydrate with items for immediate invoice access
            orders.unshift(orderData);
            saveData();
            
            // Immediate UI update
            refreshOrdersList('all');
            hideNewOrderForm();
            refreshDashboard();
            refreshStockList();
            
            alert('Order created successfully!');
        } else {
            alert('System Error: ' + (result.message || 'The server rejected the order. Update possibly already exists.'));
        }
    } catch (e) {
        console.error('Order save error:', e);
        alert('System Exception: The order saved to the database, but your browser encountered an error while updating the screen.\n\nDetails: ' + e.message);
    }
}

// Orders Functions
let currentOrderFilter = 'all';
let ordersViewCleared = false;

function updateOrderFilterCounts() {
    const counts = {
        all: orders.length,
        pending: orders.filter(o => (o.status || '').toLowerCase() === 'pending').length,
        processing: orders.filter(o => (o.status || '').toLowerCase() === 'processing').length,
        completed: orders.filter(o => (o.status || '').toLowerCase() === 'completed').length
    };

    if (document.getElementById('count-all')) document.getElementById('count-all').innerText = counts.all;
    if (document.getElementById('count-pending')) document.getElementById('count-pending').innerText = counts.pending;
    if (document.getElementById('count-processing')) document.getElementById('count-processing').innerText = counts.processing;
    if (document.getElementById('count-completed')) document.getElementById('count-completed').innerText = counts.completed;
}

function refreshOrdersList(filter = null) {
    updateOrderFilterCounts();
    if (filter !== null) currentOrderFilter = filter;
    let f = currentOrderFilter.toLowerCase();

    // Update Button Styles
    const filterBtns = {
        all: document.getElementById('btn-all'),
        pending: document.getElementById('btn-pending'),
        processing: document.getElementById('btn-processing'),
        completed: document.getElementById('btn-completed')
    };

    Object.keys(filterBtns).forEach(key => {
        const btn = filterBtns[key];
        if (btn) {
            if (key === f) {
                btn.style.background = 'var(--sky-600)';
                btn.style.color = 'white';
                btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            } else {
                btn.style.background = 'var(--gray-200)';
                btn.style.color = 'var(--gray-700)';
                btn.style.boxShadow = 'none';
            }
        }
    });

    let html = '';
    
    // Get filter values
    const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();
    const fromDate = document.getElementById('orderDateFrom')?.value;
    const toDate = document.getElementById('orderDateTo')?.value;

    if (ordersViewCleared) {
        document.getElementById('customerOrdersList').innerHTML = '<div style="text-align:center; padding:3rem; color:var(--gray-500);">Screen cleared. Use filters or click Reset to show orders.</div>';
        return;
    }

    let filteredOrders = orders.filter(o => {
        // Status filter
        const statusMatch = f === 'all' || (o.status || '').toLowerCase() === f;
        // Search filter
        const searchMatch = !search || (o.customerName || '').toLowerCase().includes(search);
        // Date filter
        const orderDate = new Date(o.date).setHours(0,0,0,0);
        const from = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
        const to = toDate ? new Date(toDate).setHours(0,0,0,0) : null;
        const dateMatch = (!from || orderDate >= from) && (!to || orderDate <= to);
        
        return statusMatch && searchMatch && dateMatch;
    });

    // Ensure latest orders are always at the top
    filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filteredOrders.length === 0) {
        html = '<div style="text-align:center; padding:2rem;">No orders found matching your filters</div>';
    } else {
        filteredOrders.forEach(order => {
            const currentStatus = (order.status || '').toLowerCase();
            let statusColor = currentStatus === 'pending' ? '#ffb74d' : (currentStatus === 'processing' ? '#64b5f6' : '#4caf50');
            let itemsHtml = '';
            (order.items || []).forEach(item => {
                itemsHtml += `
                            <div class="order-item-row">
                                <span class="product-code">${item.productCode}</span>
                                <span>Qty: ${item.quantity} | Fulfilled: ${item.fulfilled || 0}</span>
                            </div>
                        `;
            });

            html += `
                        <div class="order-card collapsed" style="border-left-color: ${statusColor};" id="order-card-${order.id}">
                            <div class="order-header" onclick="toggleOrderDetails(this)">
                                <div style="display:flex; align-items:center;">
                                    <span class="customer-name">${order.customerName}</span>
                                    <span class="expand-icon">▼</span>
                                </div>
                                <span class="order-date">${formatDate(order.date)}</span>
                            </div>
                            <div class="order-details">
                                <div class="order-items">
                                    ${itemsHtml}
                                </div>
                                <div class="order-footer">
                                    <span class="order-total">Total: ${order.totalQty} PCS | ${parseFloat(order.totalKg || 0).toFixed(2)} KG</span>
                                    <div class="order-actions">
                                        <button class="btn btn-warning btn-sm" onclick="editOrder(${order.id})">Edit</button>
                                        ${currentStatus !== 'completed' ? `<button class="btn btn-primary btn-sm" onclick="completeOrder(${order.id})">Complete</button>` : ''}
                                        <button class="btn btn-info btn-sm" onclick="showInvoice(${order.id})">Order Details</button>
                                        <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${order.id})">Delete</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
        });
    }
    document.getElementById('customerOrdersList').innerHTML = html;

    // Update active button state
    const filterContainer = document.querySelector('.filter-buttons');
    if (filterContainer) {
        const buttons = filterContainer.querySelectorAll('.btn');
        buttons.forEach(btn => {
            const btnText = btn.textContent.toLowerCase();
            if (btnText === f) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

function toggleOrderDetails(headerElement) {
    const card = headerElement.closest('.order-card');
    card.classList.toggle('collapsed');
}

function clearOrdersView() {
    ordersViewCleared = true;
    refreshOrdersList();
}

function resetOrderFilters() {
    ordersViewCleared = false;
    document.getElementById('orderSearch').value = '';
    document.getElementById('orderDateFrom').value = '';
    document.getElementById('orderDateTo').value = '';
    currentOrderFilter = 'all';
    refreshOrdersList();
}

function filterOrders(status) {
    refreshOrdersList(status);
}

function refreshCompletedOrderDropdown() {
    let select = document.getElementById('saleOrderSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Completed Order --</option>';
    
    // Filter orders: status must be 'completed', it shouldn't be processed for stock already, 
    // AND it must have at least one item with unfulfilled quantity (in case it was edited)
    let completedOrders = orders.filter(o => 
        (o.status || '').toLowerCase() === 'completed' && 
        !o.isStockSubtracted &&
        (o.items || []).some(item => (item.quantity - (item.fulfilled || 0)) > 0)
    );
    
    completedOrders.forEach(order => {
        let option = document.createElement('option');
        option.value = order.id;
        
        // Calculate remaining items to fulfill
        let remainingQty = (order.items || []).reduce((acc, item) => acc + (item.quantity - (item.fulfilled || 0)), 0);
        option.textContent = `${order.customerName} - ${formatDate(order.date)} (${remainingQty} PCS Remaining)`;
        select.appendChild(option);
    });
}

function loadCompletedOrderForSale() {
    let orderId = document.getElementById('saleOrderSelect').value;
    if (!orderId) return;

    let order = orders.find(o => o.id == orderId);
    if (!order) return;

    document.getElementById('saleRows').innerHTML = '';

    let wrapper = document.getElementById('saleCustomerWrapper');
    wrapper.innerHTML = '';
    let customerIdInput = document.createElement('input');
    customerIdInput.type = 'hidden';
    customerIdInput.id = 'saleCustomerId';
    wrapper.appendChild(customerIdInput);

    let customer = customers.find(c => c.id === order.customerId);
    if (customer) {
        let customerSearch = createCustomerSearchable('Customer', (cust) => {
            document.getElementById('saleCustomerId').value = cust.id;
        }, customer.name + ' (' + customer.uniqueId + ')');
        wrapper.appendChild(customerSearch);
        document.getElementById('saleCustomerId').value = customer.id;
    } else {
        let customerSearch = createCustomerSearchable('Customer', (cust) => {
            document.getElementById('saleCustomerId').value = cust.id;
        }, '');
        wrapper.appendChild(customerSearch);
        document.getElementById('saleCustomerId').value = '';
    }

    (order.items || []).forEach(item => {
        let row = document.createElement('div');
        row.className = 'entry-row';

        let brand = mainCategories.find(m => m.id === item.mainId);
        let brandOptions = mainCategories.map(m => ({ value: m.id, text: m.name }));

        let brandWrapper = createSearchableInput('Brand...', brandOptions, (opt) => {
            row.dataset.brandId = opt.value;
            updateSizeDropdown(row, opt.value, 'sale');
        }, true, 'brand');
        brandWrapper.querySelector('input').value = brand ? brand.name : '';
        row.dataset.brandId = item.mainId;

        let sizeWrapper = createSearchableInput('Size...', [], null, true, null);
        let itemWrapper = createSearchableInput('Item...', [], null, true, null);
        itemWrapper.querySelector('input').value = (item.itemName || 'Item') + ' (' + item.length + 'ft ' + item.weight + 'KG)';
        row.dataset.itemId = item.itemId;

        let qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.className = 'searchable-input';
        qtyInput.placeholder = 'Qty';
        qtyInput.min = '1';
        qtyInput.value = item.quantity;

        let lengthInput = document.createElement('input');
        lengthInput.type = 'number';
        lengthInput.className = 'searchable-input';
        lengthInput.value = item.length || 13;
        lengthInput.disabled = true;

        let removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-sm';
        removeBtn.textContent = '✖';
        removeBtn.onclick = () => row.remove();

        row.appendChild(brandWrapper);
        row.appendChild(sizeWrapper);
        row.appendChild(itemWrapper);
        row.appendChild(lengthInput);
        row.appendChild(qtyInput);
        row.appendChild(removeBtn);

        document.getElementById('saleRows').appendChild(row);
    });
}

async function completeOrder(orderId) {
    let order = orders.find(o => o.id == orderId);
    if (!order) return;

    let canComplete = true;
    let stockIssues = [];
    (order.items || []).forEach(item => {
        let invItem = items.find(i => i.id === item.itemId);
        if (!invItem) return;
        let remainingToFulfill = (item.quantity || 0) - (item.fulfilled || 0);
        if (remainingToFulfill > 0 && remainingToFulfill > (invItem.stock || 0)) {
            canComplete = false;
            stockIssues.push(`${item.productCode}: Need ${remainingToFulfill} but only ${invItem.stock || 0} available`);
        }
    });

    if (!canComplete) {
        alert('Cannot complete order. Some items are out of stock:\n' + stockIssues.join('\n'));
        return;
    }

    // Removed confirmation for direct completion as requested
    // if (!confirm(`Are you sure you want to complete Order #${orderId}? This will deduct remaining stock and record sales.`)) return;

    // Track if any stock was actually deducted
    let stockDeducted = false;

    for (let item of (order.items || [])) {
        let invItem = items.find(i => i.id === item.itemId);
        if (!invItem) continue;
        
        let remainingToFulfill = (item.quantity || 0) - (item.fulfilled || 0);
        if (remainingToFulfill > 0) {
            // Generate Local Date string matching database expected format YYYY-MM-DD HH:MM:S
            const now = new Date();
            const localDate = now.getFullYear() + '-' + 
                String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                String(now.getDate()).padStart(2, '0') + ' ' + 
                String(now.getHours()).padStart(2, '0') + ':' + 
                String(now.getMinutes()).padStart(2, '0') + ':' + 
                String(now.getSeconds()).padStart(2, '0');

            let tData = {
                type: 'SALE',
                date: localDate,
                mainId: invItem.mainId,
                subId: invItem.subId,
                itemId: item.itemId,
                quantity: remainingToFulfill,
                customerId: order.customerId,
                notes: `Order #${orderId} Auto-Fulfillment`
            };

            try {
                const response = await fetch('api/sync.php?action=save_transaction', {
                    method: 'POST',
                    body: JSON.stringify({ transaction: tData })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    stockDeducted = true;
                    invItem.stock = (parseFloat(invItem.stock) || 0) - parseFloat(remainingToFulfill);
                    item.fulfilled = (parseFloat(item.fulfilled) || 0) + parseFloat(remainingToFulfill);
                    
                    // Add to local history for immediate display
                    let main = mainCategories.find(m => m.id === invItem.mainId);
                    let sub = subCategories.find(s => s.id === invItem.subId);
                    transactions.unshift({
                        id: result.id,
                        ...tData,
                        type: 'OUT', // Normalize for UI
                        mainName: main ? main.name : '',
                        itemName: invItem.name,
                        subName: sub ? sub.name : '',
                        productCode: getProductCode(invItem, main, sub),
                        itemWeight: invItem.weight,
                        itemLength: invItem.length,
                        customer: order.customerName
                    });
                } else {
                    alert(`Fulfillment failed for item ${item.productCode}: ${result.message}`);
                    return; // Stop the whole process if one item fails
                }
            } catch (e) {
                console.error('Fulfillment save failed', e);
                alert('Connection error during fulfillment. Process stopped.');
                return;
            }
        }
    }

    if (stockDeducted) {
        order.isStockSubtracted = 1;
        refreshTransactions(); // Update history list immediately
    }
    
    // Update order status on server
    order.status = 'completed';

    try {
        const response = await fetch('api/sync.php?action=save_order', {
            method: 'POST',
            body: JSON.stringify({ order: order })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(`Order #${orderId} completed successfully! Stock has been deducted.`);
            // Add a slight delay before initApp to ensure database commits are ready for fetching
            setTimeout(() => {
                initApp();
            }, 300);
        } else {
            alert('Failed to update order status: ' + result.message);
        }
    } catch (e) {
        console.error('Final order save failed', e);
        alert('Stock was deducted, but final status update failed. Please refresh.');
        initApp();
    }
}

function showInvoice(orderId) {
    try {
        let order = orders.find(o => o.id == orderId);
        if (!order) {
            alert('Order not found!');
            return;
        }

        let customer = customers.find(c => c.id == order.customerId);
        let itemsHtml = '';
        (order.items || []).forEach(item => {
            const weight = parseFloat(item.weight || 0);
            const qty = parseInt(item.quantity || 0);
            itemsHtml += `<tr>
                        <td>${item.productCode || 'N/A'}</td>
                        <td>${item.length || 13} ft</td>
                        <td>${weight.toFixed(2)} KG</td>
                        <td>${qty}</td>
                        <td>${(weight * qty).toFixed(2)} KG</td>
                    </tr>`;
        });

        let invoiceHtml = `
                    <div class="invoice" style="background: white; padding: 20px; color: #333; font-family: 'Segoe UI', sans-serif;">
                        <div class="invoice-header" style="text-align: center; border-bottom: 2px solid var(--sky-500); padding-bottom: 10px; margin-bottom: 20px;">
                            <h1 style="margin: 0; color: var(--sky-600);">${companySettings.name || 'StockFlow'}</h1>
                            <p style="margin: 5px 0; color: var(--gray-500);">Order Details #${order.id}</p>
                        </div>
                        <div class="invoice-details">
                            <p><strong>Date:</strong> ${formatDate(order.date)}</p>
                            <p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
                            ${customer ? `<p><strong>Address:</strong> ${customer.address || 'N/A'}</p>` : ''}
                            ${customer ? `<p><strong>Mobile:</strong> ${customer.mobile || 'N/A'}</p>` : ''}
                        </div>
                        <table class="invoice-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Length</th>
                                    <th>Weight/Unit</th>
                                    <th>Quantity</th>
                                    <th>Total Weight</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        <div class="invoice-total">
                            Total Quantity: ${order.totalQty || 0} PCS | Total Weight: ${parseFloat(order.totalKg || 0).toFixed(2)} KG
                        </div>
                    </div>
                `;

        document.getElementById('invoiceContent').innerHTML = invoiceHtml;
        document.getElementById('invoiceModal').style.display = 'block';
    } catch (err) {
        console.error('Order Details generation failed:', err);
        alert('Order Details Error: One required piece of data is missing or corrupted. \n\nDetails: ' + err.message);
    }
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').style.display = 'none';
}

function printInvoice() {
    let printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Order Details</title>');
    printWindow.document.write('<style>body { font-family: Arial; padding: 20px; } .invoice { max-width: 800px; margin: 0 auto; } .invoice-header { text-align: center; margin-bottom: 30px; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } .invoice-total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(document.querySelector('.invoice').outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

function editOrder(orderId) {
    let order = orders.find(o => o.id == orderId);
    if (!order) return;

    let formHtml = `
                <div class="form-group">
                    <label>Date</label>
                    <input type="datetime-local" id="editOrderDate" class="form-control" value="${order.date}">
                </div>
                <h4>Order Items</h4>
                <div id="editOrderItems"></div>
                <button class="btn btn-info" onclick="addEditOrderRow()">➕ Add Item</button>
                <br><br>
                <button class="btn btn-primary" onclick="updateOrder(${order.id})">Update Order</button>
                <button class="btn btn-danger" onclick="closeEditModal()">Cancel</button>
            `;

    document.getElementById('editOrderForm').innerHTML = formHtml;
    document.getElementById('editOrderId').textContent = order.id;

    let container = document.getElementById('editOrderItems');
    (order.items || []).forEach(item => {
        let row = document.createElement('div');
        row.className = 'entry-row';

        let brand = mainCategories.find(m => m.id === item.mainId);
        let brandOptions = mainCategories.map(m => ({ value: m.id, text: m.name }));

        let brandWrapper = createSearchableInput('Brand...', brandOptions, (opt) => {
            row.dataset.brandId = opt.value;
            updateSizeDropdown(row, opt.value, 'edit');
        }, false, 'brand');
        brandWrapper.querySelector('input').value = brand ? brand.name : '';
        row.dataset.brandId = item.mainId;
        row.dataset.sizeId = item.subId;
        row.dataset.itemId = item.itemId;
        row.dataset.itemName = item.itemName;
        row.dataset.itemWeight = item.weight;
        row.dataset.itemLength = item.length;

        let sizeWrapper = createSearchableInput('Size...', [], null, true, null);
        let itemWrapper = createSearchableInput('Item...', [], null, true, null);

        let lengthInput = document.createElement('input');
        lengthInput.type = 'number';
        lengthInput.className = 'searchable-input';
        lengthInput.value = item.length || 13;
        lengthInput.min = '1';

        let qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.className = 'searchable-input';
        qtyInput.placeholder = 'Qty';
        qtyInput.min = '1';
        qtyInput.value = item.quantity;

        let removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-sm';
        removeBtn.textContent = '✖';
        removeBtn.onclick = () => row.remove();

        row.appendChild(brandWrapper);
        row.appendChild(sizeWrapper);
        row.appendChild(itemWrapper);
        row.appendChild(lengthInput);
        row.appendChild(qtyInput);
        row.appendChild(removeBtn);

        container.appendChild(row);

        setTimeout(() => {
            let sizeOptions = subCategories.filter(s => s.mainId == item.mainId).map(s => ({ value: s.id, text: s.name }));
            let newSizeWrapper = createSearchableInput('Size...', sizeOptions, (opt) => {
                row.dataset.sizeId = opt.value;
                updateItemDropdown(row, item.mainId, opt.value, 'edit');
            }, false, 'size', item.mainId);
            newSizeWrapper.querySelector('input').value = item.subName || '';
            row.replaceChild(newSizeWrapper, sizeWrapper);

            setTimeout(() => {
                let itemOptions = items.filter(i => i.mainId == item.mainId && i.subId == item.subId).map(i => ({
                    value: i.id,
                    text: (i.name && i.name !== 'Item' ? i.name + ' ' : '') + `(${i.length}ft ${i.weight}KG)`,
                    stock: i.stock || 0,
                    length: i.length,
                    weight: i.weight,
                    item: i
                }));
                const itemSearch = createSearchableInput('Item...', itemOptions, (opt) => {
                    row.dataset.itemId = opt.value;
                    row.dataset.itemName = opt.item.name;
                    row.dataset.itemWeight = opt.item.weight;
                    row.dataset.itemLength = opt.item.length;
                    lengthInput.value = opt.item.length;
                }, false, 'item', { brandId: item.mainId, sizeId: item.subId });
                const itemLabel = (item.itemName && item.itemName !== 'N/A' && item.itemName !== 'Item') ? item.itemName + ' ' : '';
                itemSearch.querySelector('input').value = `${itemLabel}(${item.length}ft ${item.weight}KG)`;
                row.replaceChild(itemSearch, itemWrapper);
                
                // If it was completed, and we edited it, let it show up in the dropdown again if new stock is added
                if (order.status === 'completed') {
                    usedCompletedOrders.delete(order.id);
                    refreshCompletedOrderDropdown();
                }
            }, 100);
        }, 100);
    });

    document.getElementById('editOrderModal').style.display = 'block';
}

function addEditOrderRow() {
    let container = document.getElementById('editOrderItems');
    const row = document.createElement('div');
    row.className = 'entry-row';
    const brandOptions = mainCategories.map(m => ({ value: m.id, text: m.name }));
    const brandWrapper = createSearchableInput('Brand...', brandOptions, (opt) => {
        row.dataset.brandId = opt.value;
        updateSizeDropdown(row, opt.value, 'edit');
    }, false, 'brand');
    const sizeWrapper = createSearchableInput('Size...', [], null, true, null);
    const itemWrapper = createSearchableInput('Item...', [], null, true, null);

    const lengthInput = document.createElement('input');
    lengthInput.type = 'number';
    lengthInput.className = 'searchable-input';
    lengthInput.placeholder = 'Length';
    lengthInput.value = '13';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.className = 'searchable-input';
    qtyInput.placeholder = 'Qty';
    qtyInput.min = '1';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger btn-sm';
    removeBtn.textContent = '✖';
    removeBtn.onclick = () => row.remove();

    row.appendChild(brandWrapper);
    row.appendChild(sizeWrapper);
    row.appendChild(itemWrapper);
    row.appendChild(lengthInput);
    row.appendChild(qtyInput);
    row.appendChild(removeBtn);

    container.appendChild(row);
}

async function updateOrder(orderId) {
    let order = orders.find(o => o.id == orderId);
    if (!order) return;

    let rows = document.getElementById('editOrderItems').children;
    let orderItems = [];
    let totalQty = 0; let totalKg = 0;

    for (let row of rows) {
        const itemId = row.dataset.itemId;
        const lengthInput = row.children[3];
        const qtyInput = row.children[4];
        const qty = parseInt(qtyInput ? qtyInput.value : 0);
        const length = parseInt(lengthInput ? lengthInput.value : 13);

        if (!itemId || !qty || qty <= 0) continue;
        let item = items.find(i => i.id == itemId);
        if (!item) continue;

        if (length && length > 0) item.length = length;

        let main = mainCategories.find(m => m.id === item.mainId);
        let sub = subCategories.find(s => s.id === item.subId);

        let existingItem = order.items.find(i => i.itemId == itemId);
        let fulfilled = existingItem ? existingItem.fulfilled || 0 : 0;

        orderItems.push({
            itemId: itemId,
            mainId: item.mainId,
            subId: item.subId,
            mainName: main ? main.name : (existingItem ? existingItem.mainName : ''),
            subName: sub ? sub.name : (existingItem ? existingItem.subName : ''),
            productCode: getProductCode(item, main, sub) || (existingItem ? existingItem.productCode : 'N/A'),
            itemName: item.name || (existingItem ? existingItem.itemName : ''),
            weight: item.weight || (existingItem ? existingItem.weight : 0),
            length: item.length || (existingItem ? existingItem.length : 13),
            quantity: qty,
            fulfilled: fulfilled
        });
        totalQty += qty; totalKg += qty * (item.weight || 0);
    }

    if (orderItems.length === 0) { alert('Please add at least one item'); return; }

    let updatedData = {
        ...order,
        date: document.getElementById('editOrderDate').value,
        items: orderItems,
        totalQty: totalQty,
        totalKg: totalKg
    };

    try {
        const response = await fetch('api/sync.php?action=save_order', {
            method: 'POST',
            body: JSON.stringify({ order: updatedData })
        });
        const result = await response.json();
        if (result.status === 'success') {
            Object.assign(order, updatedData);
            saveData();
            refreshOrdersList();
            closeEditModal();
            alert('Order updated successfully!');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Sync failed.');
    }
}

function closeEditModal() {
    document.getElementById('editOrderModal').style.display = 'none';
}

function openDeleteModal(orderId) {
    document.getElementById('deleteOrderId').textContent = orderId;
    document.getElementById('deleteOrderModal').style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('deleteOrderModal').style.display = 'none';
}

async function confirmDeleteOrder() {
    let orderId = parseInt(document.getElementById('deleteOrderId').textContent);
    try {
        const response = await fetch('api/sync.php?action=delete_order', {
            method: 'POST',
            body: JSON.stringify({ id: orderId })
        });
        
        const rawBody = await response.text();
        let result;
        try {
            result = JSON.parse(rawBody);
        } catch (parseErr) {
            alert('Server Error: Delele failed properly (SQL Error possible).\n\nDetails: ' + rawBody.slice(0, 200));
            return;
        }

        if (result.status === 'success') {
            orders = orders.filter(o => o.id !== orderId);
            saveData();
            closeDeleteModal();
            refreshOrdersList();
            refreshDashboard();
            refreshStockList();
            refreshLowStockReport();
            alert('Order deleted successfully!');
        } else {
            alert('Error: ' + (result.message || 'The server rejected the delete request.'));
        }
    } catch (e) {
        console.error('Delete error:', e);
        alert('Transmission Failed: Could not reach the server to delete the order.');
    }
}

function refreshCategoriesView() {
    resequenceCodes(); // Force re-sequence to fill gaps before drawing
    const currentExpandedMains = Array.from(document.querySelectorAll('.main-category.expanded')).map(el => el.id);
    const currentExpandedSubs = Array.from(document.querySelectorAll('.sub-category.expanded')).map(el => el.id);
    
    let html = '';
    sortMainCategories(mainCategories).forEach(main => {
        let mainSubs = subCategories.filter(s => s.mainId === main.id);
        let mainItems = items.filter(i => i.mainId === main.id);
        let totalStock = mainItems.reduce((sum, i) => sum + (i.stock || 0), 0);
        let mainCode = main.code || String(main.id).padStart(2, '0');

        let subHtml = '';
        sortSubCategories(mainSubs).forEach(sub => {
            let subItems = items.filter(i => i.mainId === main.id && i.subId === sub.id);
            let subTotalStock = subItems.reduce((sum, i) => sum + (i.stock || 0), 0);
            let subCode = sub.code || 'SIZE_ERR'; 

            let itemsHtml = '';
            sortItems(subItems).forEach(item => {
                let itemCode = item.code || 'ITEM_ERR';
                itemsHtml += `
                            <div class="item-row">
                                <div class="item-info">
                                    <span class="item-name-badge">[${itemCode}] ${item.name || 'Item'}</span>
                                    <div class="item-specs">
                                        <span class="item-spec">${item.length} ft</span>
                                        <span class="item-spec">${item.weight} KG</span>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <div style="text-align: right;">
                                        <div class="item-stock" style="color: ${parseInt(item.stock) <= (item.lowStockLimit || main.lowStockLimit || 10) ? 'var(--red-500)' : ''}">${item.stock || 0}</div>
                                        ${item.lowStockLimit ? `<div style="font-size: 0.7rem; color: var(--orange-500); font-weight: 600;">Limit: ${item.lowStockLimit}</div>` : ''}
                                    </div>
                                    <div class="item-actions">
                                        <button class="btn-icon btn-icon-sm" onclick="editItem(${item.id})" title="Edit">✏️</button>
                                        <button class="btn-icon btn-icon-sm" onclick="deleteItem(${item.id})" title="Delete">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        `;
            });

            subHtml += `
                        <div class="sub-category" id="subCat_${sub.id}">
                            <div class="sub-header" onclick="toggleSubCategory(this)">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <span class="sub-name">[${subCode}] ${sub.name}</span>
                                    <span class="sub-stats">Total: ${subTotalStock} PCS</span>
                                </div>
                                <div class="sub-actions">
                                    <button class="btn-icon btn-icon-sm" onclick="editSubCategory(${sub.id}); event.stopPropagation();" title="Edit Size">✏️</button>
                                    <button class="btn-icon btn-icon-sm" onclick="deleteSubCategory(${sub.id}); event.stopPropagation();" title="Delete Size">🗑️</button>
                                    <button class="add-btn add-btn-sm" onclick="showAddItemModalFor(${main.id}, ${sub.id}); event.stopPropagation();">+ Add Item</button>
                                </div>
                            </div>
                            <div class="items-container">
                                ${itemsHtml || '<div style="color: var(--gray-500); text-align: center; padding: 1rem;">No items in this size</div>'}
                            </div>
                        </div>
                    `;
        });

        html += `
                    <div class="main-category" id="mainCat_${main.id}">
                        <div class="category-header" onclick="toggleMainCategory(this)">
                            <div class="category-title">
                                <span class="color-dot" style="background: ${main.color};"></span>
                                <span class="category-name">[${mainCode}] ${main.name}</span>
                                <span class="category-stats">Total Stock: ${totalStock} PCS</span>
                            </div>
                            <div class="category-actions">
                                <button class="btn-icon" onclick="editMainCategory(${main.id}); event.stopPropagation();" title="Edit Brand">✏️</button>
                                <button class="btn-icon" onclick="deleteMainCategory(${main.id}); event.stopPropagation();" title="Delete Brand">🗑️</button>
                                <button class="add-btn" onclick="showAddSubCategoryModalFor(${main.id}); event.stopPropagation();">+ Add Size</button>
                            </div>
                        </div>
                        <div class="sub-category-container">
                            ${subHtml || '<div style="color: var(--gray-500); text-align: center; padding: 2rem;">No sizes added yet. Click "Add Size" to create one.</div>'}
                        </div>
                    </div>
                `;
    });
    document.getElementById('categoriesContainer').innerHTML = html;

    currentExpandedMains.forEach(id => { let el = document.getElementById(id); if (el) el.classList.add('expanded'); });
    currentExpandedSubs.forEach(id => { let el = document.getElementById(id); if (el) el.classList.add('expanded'); });
}

function showAddSubCategoryModalFor(mainId) {
    let select = document.getElementById('subCategoryMainSelect');
    select.innerHTML = '';
    mainCategories.forEach(main => {
        let option = document.createElement('option');
        option.value = main.id;
        option.textContent = main.name;
        option.style.color = main.color;
        select.appendChild(option);
    });
    select.value = mainId;
    document.getElementById('subCategoryModalTitle').textContent = '➕ Add Size';
    document.getElementById('editSubCategoryId').value = '';
    document.getElementById('subCategoryName').value = '';
    document.getElementById('subCategoryUnit').value = 'inch';
    document.getElementById('addSubCategoryModal').style.display = 'block';
}

function showAddItemModalFor(mainId, subId) {
    document.getElementById('itemMainId').value = mainId;
    document.getElementById('itemSubId').value = subId;
    document.getElementById('itemModalTitle').textContent = '➕ Add Item';
    document.getElementById('editItemId').value = '';
    document.getElementById('itemLength').value = '13';
    document.getElementById('itemWeight').value = '';
    document.getElementById('itemStock').value = '0';
    document.getElementById('addItemModal').style.display = 'block';
}

// Main Category CRUD
function showAddMainCategoryModal() {
    document.getElementById('mainCategoryModalTitle').textContent = '➕ Add Brand';
    document.getElementById('editMainCategoryId').value = '';
    document.getElementById('mainCategoryName').value = '';
    document.getElementById('mainCategoryCode').value = '';
    document.getElementById('mainCategoryColor').value = '#2196f3';
    document.getElementById('mainCategoryLowStock').value = '10';
    document.getElementById('addMainCategoryModal').style.display = 'block';
}

function closeAddMainCategoryModal() {
    document.getElementById('addMainCategoryModal').style.display = 'none';
}

function editMainCategory(id) {
    let main = mainCategories.find(m => m.id === id);
    if (main) {
        document.getElementById('mainCategoryModalTitle').textContent = '✏️ Edit Brand';
        document.getElementById('editMainCategoryId').value = main.id;
        document.getElementById('mainCategoryName').value = main.name;
        document.getElementById('mainCategoryCode').value = main.code || '';
        document.getElementById('mainCategoryColor').value = main.color;
        document.getElementById('mainCategoryLowStock').value = main.lowStockLimit || 10;
        document.getElementById('addMainCategoryModal').style.display = 'block';
    }
}

async function deleteMainCategory(id) {
    let subCount = subCategories.filter(s => s.mainId === id).length;
    if (subCount > 0) {
        alert(`Cannot delete brand because it has ${subCount} size(s). Please delete all sizes first.`);
        return;
    }
    if (confirm('Are you sure you want to delete this brand?')) {
        try {
            const response = await fetch('api/sync.php?action=delete_category', {
                method: 'POST',
                body: JSON.stringify({ id: id, type: 'main' })
            });
            const result = await response.json();
            if (result.status === 'success') {
                items = items.filter(i => i.mainId !== id);
                mainCategories = mainCategories.filter(m => m.id !== id);
                saveData();
                refreshCategoriesView();
                refreshDashboard();
                refreshStockList();
                refreshLowStockReport();
                alert('Brand deleted!');
            } else { alert('Delete failed: ' + result.message); }
        } catch (e) { alert('Sync failed.'); }
    }
}

async function saveMainCategory() {
    let id = document.getElementById('editMainCategoryId').value;
    let name = document.getElementById('mainCategoryName').value;
    let code = document.getElementById('mainCategoryCode').value;
    let color = document.getElementById('mainCategoryColor').value;
    let lowStockLimit = parseInt(document.getElementById('mainCategoryLowStock').value) || 10;
    if (!name) { alert('Enter brand name'); return; }

    let catData = { id, name, code, color, lowStockLimit };
    try {
        const response = await fetch('api/sync.php?action=save_category', {
            method: 'POST',
            body: JSON.stringify({ type: 'main', category: catData })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            if (id) {
                let main = mainCategories.find(m => m.id == id);
                if (main) {
                    main.name = name; main.code = code; main.color = color; main.lowStockLimit = lowStockLimit;
                }
            } else {
                let newId = result.id;
                mainCategories.push({ id: newId, code, name, color, lowStockLimit });
            }
            saveData();
            refreshCategoriesView();
            refreshDashboard();
            refreshStockList();
            refreshLowStockReport();
            closeAddMainCategoryModal();
            alert('Saved successfully!');
        } else {
            alert('Server Error: ' + (result.message || 'Unknown error saving brand'));
        }
    } catch (e) {
        alert('Error: Not saved to server.');
    }
}

// Sub Category CRUD
function showAddSubCategoryModal() {
    if (mainCategories.length === 0) { alert('Add a brand first!'); return; }
    let select = document.getElementById('subCategoryMainSelect');
    select.innerHTML = '';
    mainCategories.forEach(main => {
        let option = document.createElement('option');
        option.value = main.id;
        option.textContent = main.name;
        option.style.color = main.color;
        select.appendChild(option);
    });
    document.getElementById('subCategoryModalTitle').textContent = '➕ Add Size';
    document.getElementById('editSubCategoryId').value = '';
    document.getElementById('subCategoryName').value = '';
    document.getElementById('subCategoryUnit').value = 'inch';
    document.getElementById('addSubCategoryModal').style.display = 'block';
}

function closeAddSubCategoryModal() {
    document.getElementById('addSubCategoryModal').style.display = 'none';
}

function editSubCategory(id) {
    let sub = subCategories.find(s => s.id === id);
    if (sub) {
        let select = document.getElementById('subCategoryMainSelect');
        select.innerHTML = '';
        mainCategories.forEach(main => {
            let option = document.createElement('option');
            option.value = main.id;
            option.textContent = main.name;
            option.style.color = main.color;
            if (main.id === sub.mainId) option.selected = true;
            select.appendChild(option);
        });
        let sizeValue = parseFloat(sub.name) || sub.name.replace(/[^0-9.]/g, '');
        let unit = sub.name.includes('mm') ? 'mm' : 'inch';
        document.getElementById('subCategoryModalTitle').textContent = '✏️ Edit Size';
        document.getElementById('editSubCategoryId').value = sub.id;
        document.getElementById('subCategoryName').value = sizeValue;
        document.getElementById('subCategoryUnit').value = unit;
        document.getElementById('addSubCategoryModal').style.display = 'block';
    }
}

async function deleteSubCategory(id) {
    let sub = subCategories.find(s => s.id === id);
    if (!sub) return;
    let itemCount = items.filter(i => i.subId === id).length;
    if (itemCount > 0) {
        alert(`Cannot delete size because it has ${itemCount} item(s). Please delete all items first.`);
        return;
    }
    if (confirm(`Delete size "${sub.name}"?`)) {
        try {
            const response = await fetch('api/sync.php?action=delete_category', {
                method: 'POST',
                body: JSON.stringify({ type: 'sub', id: id })
            });
            const result = await response.json();
            if (result.status === 'success') {
                subCategories = subCategories.filter(s => s.id !== id);
                resequenceCodes();
                refreshCategoriesView();
                alert('Size deleted!');
            } else { alert('Delete failed: ' + result.message); }
        } catch (e) { alert('Sync failed.'); }
    }
}

async function deleteItem(id) {
    let item = items.find(i => i.id === id);
    if (!item) return;
    if (confirm('Are you sure you want to delete this item? This will remove all its transaction history.')) {
        try {
            const response = await fetch('api/sync.php?action=delete_item', {
                method: 'POST',
                body: JSON.stringify({ id: id })
            });
            const result = await response.json();
            if (result.status === 'success') {
                items = items.filter(i => i.id !== id);
                resequenceCodes();
                refreshCategoriesView();
                refreshDashboard();
                refreshStockList();
                refreshLowStockReport();
                alert('Item deleted!');
            } else { alert('Delete failed: ' + result.message); }
        } catch (e) { alert('Sync failed.'); }
    }
}

async function saveSubCategory() {
    let id = document.getElementById('editSubCategoryId').value;
    let mainId = parseInt(document.getElementById('subCategoryMainSelect').value);
    let sizeValue = document.getElementById('subCategoryName').value;
    let unit = document.getElementById('subCategoryUnit').value;
    if (!sizeValue) { alert('Enter size'); return; }
    let fullName = sizeValue + (unit === 'inch' ? '"' : 'mm');

    let catData = { id, mainId, name: fullName };
    try {
        const response = await fetch('api/sync.php?action=save_category', {
            method: 'POST',
            body: JSON.stringify({ type: 'sub', category: catData })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            const returnedId = parseInt(result.id);
            if (id) {
                let sub = subCategories.find(s => parseInt(s.id) === parseInt(id));
                if (sub) { sub.mainId = mainId; sub.name = fullName; }
            } else {
                subCategories.push({ id: returnedId, mainId, name: fullName });
            }
            resequenceCodes();
            saveData();
            refreshCategoriesView();
            refreshDashboard();
            refreshStockList();
            refreshLowStockReport();
            closeAddSubCategoryModal();
            alert('Saved successfully');
        }
    } catch (e) {
        alert('Software Error: Size saved to database, but the app display failed to update.\n\nDetails: ' + e.message);
    }
}

// Item CRUD (Simplified)
function showAddItemModal() {
    if (mainCategories.length === 0) { alert('Add a brand first!'); return; }
    if (subCategories.length === 0) { alert('Add a size first!'); return; }
    document.getElementById('itemModalTitle').textContent = '➕ Add Item';
    document.getElementById('editItemId').value = '';
    updateLengthDropdowns('itemLength');
    document.getElementById('itemLength').value = '13';
    document.getElementById('itemWeight').value = '';
    document.getElementById('itemStock').value = '0';
    document.getElementById('addItemModal').style.display = 'block';
}

function closeAddItemModal() {
    document.getElementById('addItemModal').style.display = 'none';
}

function editItem(id) {
    let item = items.find(i => i.id === id);
    if (item) {
        document.getElementById('itemModalTitle').textContent = '✏️ Edit Item';
        document.getElementById('editItemId').value = item.id;
        document.getElementById('itemMainId').value = item.mainId;
        document.getElementById('itemSubId').value = item.subId;
        
        // Ensure length exists in dropdown before selecting
        let len = parseFloat(item.length) || 13;
        if (!companySettings.availableLengths.includes(len)) {
            companySettings.availableLengths.push(len);
            updateLengthDropdowns();
        }
        document.getElementById('itemLength').value = len;

        document.getElementById('itemWeight').value = item.weight || '';
        document.getElementById('itemStock').value = item.stock || 0;
        document.getElementById('itemLowStock').value = item.lowStockLimit || '';
        document.getElementById('addItemModal').style.display = 'block';
    }
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            const response = await fetch('api/sync.php?action=delete_item', {
                method: 'POST',
                body: JSON.stringify({ id: id })
            });
            const result = await response.json();
            if (result.status === 'success') {
                items = items.filter(i => i.id != id);
                resequenceCodes();
                saveData();
                refreshCategoriesView();
                refreshDashboard();
                refreshStockList();
                refreshLowStockReport();
                alert('Item deleted!');
            } else { alert('Delete failed: ' + result.message); }
        } catch (e) { alert('Sync failed.'); }
    }
}

async function saveItem() {
    let id = document.getElementById('editItemId').value;
    let mainId = parseInt(document.getElementById('itemMainId').value);
    let subId = parseInt(document.getElementById('itemSubId').value);
    let length = parseFloat(document.getElementById('itemLength').value) || 13;
    let weight = parseFloat(document.getElementById('itemWeight').value);
    let stock = parseInt(document.getElementById('itemStock').value) || 0;
    let lowStockLimit = parseInt(document.getElementById('itemLowStock').value) || null;

    if (!mainId || !subId || !weight) {
        alert('Please fill all required fields (Weight is required)');
        return;
    }

    let main = mainCategories.find(m => m.id === mainId);
    let sub = subCategories.find(s => s.id === subId);
    let minStock = main ? main.lowStockLimit : 10;

    let itemData = { id, mainId, subId, length, weight, stock, lowStockLimit };

    try {
        const response = await fetch('api/sync.php?action=save_item', {
            method: 'POST',
            body: JSON.stringify({ item: itemData })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            if (id) {
                let item = items.find(i => i.id == id);
                if (item) {
                    item.mainId = mainId; item.subId = subId; item.length = length;
                    item.weight = weight; item.stock = stock; item.lowStockLimit = lowStockLimit;
                }
            } else {
                let newId = result.id;
                items.push({ id: newId, code: '', mainId, subId, name: '', length, weight, stock, lowStockLimit });
            }
            resequenceCodes();
            saveData();
            alert('Saved successfully!');
            closeAddItemModal();
            refreshCategoriesView();
            refreshDashboard();
            refreshStockList();
            refreshLowStockReport();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        console.error('Save failed:', e);
        alert('Error: Server connection failed.');
    }
}

// User Management
function showAddUserModal() {
    document.getElementById('editUserId').value = '';
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserUsername').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserRole').value = 'user';
    document.getElementById('userModalTitle').innerText = '➕ Create New User Account';
    document.getElementById('userSaveBtn').innerText = 'Create User Account';
    
    renderPermissionsTable();
    handleRoleChange('user');
    
    document.getElementById('addUserModal').style.display = 'block';
}

function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
}

async function saveNewUser() {
    let editId = document.getElementById('editUserId').value;
    let name = document.getElementById('newUserName').value;
    let username = document.getElementById('newUserUsername').value;
    let password = document.getElementById('newUserPassword').value;
    let role = document.getElementById('newUserRole').value;
    const permissions = collectPermissions();
    if (!name || !username || !password) { alert('Please fill all fields'); return; }

    try {
        const response = await fetch('api/sync.php?action=save_user', {
            method: 'POST',
            body: JSON.stringify({ user: { id: editId, name, username, password, role, permissions } })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (editId) {
                let idx = users.findIndex(u => u.id == editId);
                if (idx !== -1) users[idx] = { id: editId, name, username, password, role, permissions };
                alert('User updated successfully!');
            } else {
                users.push({ id: result.id, name, username, password, role, permissions });
                alert('User created successfully!');
            }
            refreshUsersList();
            closeAddUserModal();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Server connection failed. User not saved.');
    }
}

function editUser(userId) {
    let user = users.find(u => u.id == userId);
    if (!user) return;
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('newUserName').value = user.name;
    document.getElementById('newUserUsername').value = user.username;
    document.getElementById('newUserPassword').value = user.password;
    document.getElementById('newUserRole').value = user.role || 'user';
    
    renderPermissionsTable();
    handleRoleChange(user.role || 'user');
    if (user.role !== 'admin') {
        applyPermissionsToUI(user.permissions);
    }
    
    document.getElementById('userModalTitle').innerText = '✏️ Edit User Profile';
    document.getElementById('userSaveBtn').innerText = 'Update User Profile';
    document.getElementById('addUserModal').style.display = 'block';
}

function refreshUsersList() {
    let listHtml = '';
    let selectHtml = '<option value="">-- Choose a user --</option>';

    users.forEach(user => {
        listHtml += `<tr>
                    <td style="padding:0.5rem; border-bottom:1px solid #eee;">${user.name}</td>
                    <td style="padding:0.5rem; border-bottom:1px solid #eee;">${user.username}</td>
                    <td style="padding:0.5rem; border-bottom:1px solid #eee;">${user.role}</td>
                    <td style="padding:0.5rem; border-bottom:1px solid #eee;">
                        <button class="btn btn-success btn-sm" onclick="editUser(${user.id})">Edit</button>
                        ${user.id != 1 ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Delete</button>` : ''}
                    </td>
                </tr>`;
        // Sync dropdown
        selectHtml += `<option value="${user.id}">${user.name} (@${user.username})</option>`;
    });
    if (listHtml && document.getElementById('usersList')) document.getElementById('usersList').innerHTML = listHtml;
    if (selectHtml && document.getElementById('userRightsSelector')) document.getElementById('userRightsSelector').innerHTML = selectHtml;
}

// Data Management
function exportData(type) {
    window.location.href = `api/export.php?action=${type}`;
}

async function handleRestore(event) {
    const file = event.target.files[0];
    if (!file) return;

    const confirmed = confirm("⚠️ ATTENTION: This will DELETE all current data and restore from the backup file. Are you absolutely sure?");
    if (!confirmed) {
        event.target.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('api/restore.php', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(result.message);
            // Full refresh to reload everything from the newly restored database
            window.location.reload();
        } else {
            alert('Restore Error: ' + result.message);
        }
    } catch (e) {
        alert('Server connection failed. Could not restore database.');
    } finally {
        event.target.value = '';
    }
}

async function importData(type, event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm(`Are you sure you want to import data from this file? This will update your database.`)) {
        event.target.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`api/import.php?action=${type}`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            alert(result.message);
            // Reload app data to reflect changes
            initApp();
        } else {
            alert('Import Error: ' + result.message);
        }
    } catch (e) {
        alert('Server connection failed. Could not import data.');
    } finally {
        // Reset file input
        event.target.value = '';
    }
}

// Transaction Management
function editTransaction(id) {
    const t = transactions.find(x => x.id == id);
    if (!t) return;

    document.getElementById('editTransId').value = t.id;
    document.getElementById('editTransDate').value = t.date.substring(0, 16); // Format for datetime-local
    document.getElementById('editTransQty').value = t.quantity;
    document.getElementById('editTransNotes').value = t.notes || '';
    
    // Set info label
    const typeLabel = t.type === 'IN' ? 'Production' : (t.type === 'OUT' ? 'Sale' : 'Adjustment');
    document.getElementById('editTransInfo').innerText = `${typeLabel}: ${t.mainName} - ${t.itemName || 'Item'}`;
    document.getElementById('editTransQtyLabel').innerText = `Quantity (${t.type})`;
    
    document.getElementById('editTransactionModal').style.display = 'block';
}

function closeEditTransactionModal() {
    document.getElementById('editTransactionModal').style.display = 'none';
}

async function saveTransactionEdit() {
    const id = document.getElementById('editTransId').value;
    const date = document.getElementById('editTransDate').value;
    const qty = parseFloat(document.getElementById('editTransQty').value);
    const notes = document.getElementById('editTransNotes').value;

    if (isNaN(qty)) { alert('Please enter a valid quantity'); return; }

    try {
        const response = await fetch('api/sync.php?action=update_transaction', {
            method: 'POST',
            body: JSON.stringify({ transaction: { id, date, quantity: qty, notes } })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert('Transaction updated successfully');
            closeEditTransactionModal();
            initApp(); // Refresh everything to update stocks and history
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Server connection failed');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this record from history? Note: This will NOT revert the stock change, it only cleans up the list.')) return;

    try {
        const response = await fetch('api/sync.php?action=delete_transaction', {
            method: 'POST',
            body: JSON.stringify({ id: id })
        });
        const result = await response.json();
        if (result.status === 'success') {
            transactions = transactions.filter(t => t.id != id);
            refreshTransactions();
            alert('Record deleted from history');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Server connection failed');
    }
}

async function clearAllTransactions() {
    if (!confirm('⚠️ WARNING: You are about to DELETE ALL transaction history records.')) return;
    if (!confirm('Are you absolutely sure? This cannot be undone. (Wait status: Stock will NOT be affected)')) return;

    try {
        const response = await fetch('api/sync.php?action=clear_all_transactions', {
            method: 'POST'
        });
        const result = await response.json();
        if (result.status === 'success') {
            transactions = [];
            refreshTransactions();
            alert('All transaction history cleared.');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Server connection failed');
    }
}

async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            const response = await fetch('api/sync.php?action=delete_user', {
                method: 'POST',
                body: JSON.stringify({ id: userId })
            });
            const result = await response.json();
            if (result.status === 'success') {
                users = users.filter(u => u.id !== userId);
                refreshUsersList();
                alert('User deleted.');
            } else {
                alert('Error: ' + result.message);
            }
        } catch (e) {
            alert('Server connection failed. Could not delete user.');
        }
    }
}

let transViewCleared = false;

function refreshTransactions() {
    let rows = '';
    const search = (document.getElementById('transSearch')?.value || '').toLowerCase();
    const fromDate = document.getElementById('transDateFrom')?.value;
    const toDate = document.getElementById('transDateTo')?.value;

    // Calculate Last Recorded Production (KG) - find the most recent day with production
    let maxDate = null;
    transactions.forEach(t => {
        if (t.type === 'IN') {
            const d = new Date(t.date);
            if (!isNaN(d.getTime())) {
                if (!maxDate || d > maxDate) maxDate = d;
            }
        }
    });

    let dailyProdOverallKg = 0;
    const lastProdLabel = document.getElementById('lastProdDateLabel');

    if (maxDate) {
        const targetDateStr = maxDate.toDateString();
        transactions.forEach(t => {
            if (t.type === 'IN') {
                const tDate = new Date(t.date);
                if (!isNaN(tDate.getTime()) && tDate.toDateString() === targetDateStr) {
                    dailyProdOverallKg += (parseFloat(t.quantity) || 0) * (parseFloat(t.itemWeight) || 0);
                }
            }
        });

        if (lastProdLabel) {
            const day = String(maxDate.getDate()).padStart(2, '0');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            lastProdLabel.innerText = `${day}-${monthNames[maxDate.getMonth()]}-${maxDate.getFullYear()}`;
        }
    } else {
        if (lastProdLabel) lastProdLabel.innerText = "--";
    }
    
    const dailyProdEl = document.getElementById('dailyProductionWeight');
    if (dailyProdEl) {
        dailyProdEl.innerText = dailyProdOverallKg.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' KG';
    }

    if (transViewCleared) {
        document.getElementById('transactionsBody').innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--gray-500);">Screen cleared. Use search or dates to find records.</td></tr>';
        return;
    }

    let filtered = transactions.filter(t => {
        const searchMatch = !search || 
            (t.mainName || '').toLowerCase().includes(search) || 
            (t.itemName || '').toLowerCase().includes(search) ||
            (t.customer || '').toLowerCase().includes(search);
        
        const tDate = new Date(t.date).setHours(0,0,0,0);
        const from = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
        const to = toDate ? new Date(toDate).setHours(0,0,0,0) : null;
        const dateMatch = (!from || tDate >= from) && (!to || tDate <= to);

        return searchMatch && dateMatch;
    });

    // Ensure latest transactions are always at the top
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        rows = '<tr><td colspan="7" style="text-align:center; padding:1rem;">No transactions found matching your filters</td></tr>';
    } else {
        const displayList = (search || fromDate || toDate) ? filtered : filtered.slice(0, 100);
        displayList.forEach(t => {
            rows += `<tr>
                        <td style="padding:0.5rem; border-bottom:1px solid #eee;">${formatDate(t.date)}</td>
                        <td style="padding:0.5rem; border-bottom:1px solid #eee;"><span class="badge badge-${t.type.toLowerCase()}">${t.type}</span></td>
                        <td style="padding:0.5rem; border-bottom:1px solid #eee;">${t.mainName || 'N/A'}</td>
                        <td style="padding:0.5rem; border-bottom:1px solid #eee;">${t.itemName || t.subName || 'N/A'}</td>
                        <td style="padding:0.5rem; border-bottom:1px solid #eee;"><strong>${t.quantity}</strong></td>
                        <td style="padding:0.5rem; border-bottom:1px solid #eee;">${t.customer || '-'}</td>
                        <td style="padding:0.5rem; border-bottom:1px solid #eee;">
                            <div style="display:flex; gap:0.3rem; flex-wrap: wrap;">
                                <button class="btn btn-primary btn-sm" onclick="revertTransaction(${t.id})" style="background:#0ea5e9; border:none; padding: 4px 8px; font-size: 0.75rem;" title="Remove & Revert Stock"><i class="fas fa-undo"></i> Remove</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${t.id})" style="padding: 4px 8px; font-size: 0.75rem;" title="Delete record only"><i class="fas fa-trash"></i> Delete</button>
                            </div>
                        </td>
                    </tr>`;
        });
    }
    document.getElementById('transactionsBody').innerHTML = rows;
}

function clearTransactionView() {
    transViewCleared = true;
    refreshTransactions();
}

function resetTransactionFilters() {
    transViewCleared = false;
    document.getElementById('transSearch').value = '';
    document.getElementById('transDateFrom').value = '';
    document.getElementById('transDateTo').value = '';
    refreshTransactions();
}

function exportTransactions(format) {
    const search = (document.getElementById('transSearch')?.value || '').toLowerCase();
    const fromDate = document.getElementById('transDateFrom')?.value;
    const toDate = document.getElementById('transDateTo')?.value;

    let filtered = transactions.filter(t => {
        const searchMatch = !search || 
            (t.mainName || '').toLowerCase().includes(search) || 
            (t.itemName || '').toLowerCase().includes(search) ||
            (t.customer || '').toLowerCase().includes(search);
        
        const tDate = new Date(t.date).setHours(0,0,0,0);
        const from = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
        const to = toDate ? new Date(toDate).setHours(0,0,0,0) : null;
        const dateMatch = (!from || tDate >= from) && (!to || tDate <= to);

        return searchMatch && dateMatch;
    });

    if (filtered.length === 0) {
        alert("No data found to export!");
        return;
    }

    const exportData = filtered.map(t => ({
        "Date": formatDate(t.date),
        "Type": t.type,
        "Brand": t.mainName || 'N/A',
        "Product": t.itemName || t.subName || 'N/A',
        "Qty": t.quantity,
        "Customer": t.customer || '-'
    }));

    const fileName = `Transactions_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}`;

    if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
        
        // Auto-size columns
        const maxWidths = {};
        exportData.forEach(row => {
            Object.keys(row).forEach(key => {
                const val = String(row[key]);
                maxWidths[key] = Math.max(maxWidths[key] || 10, val.length + 2);
            });
        });
        worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] }));

        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(18);
        doc.setTextColor(2, 132, 199); // --sky-600
        doc.text("Transactions History Report", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        if (fromDate || toDate) {
            doc.text(`Period: ${fromDate || 'Start'} to ${toDate || 'Today'}`, 14, 35);
        }

        const tableColumn = ["Date", "Type", "Brand", "Product", "Qty", "Customer"];
        const tableRows = exportData.map(row => [
            row.Date,
            row.Type,
            row.Brand,
            row.Product,
            row.Qty,
            row.Customer
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [2, 132, 199], textColor: 255 }, // --sky-600
            alternateRowStyles: { fillColor: [241, 245, 249] } // --gray-100
        });

        doc.save(`${fileName}.pdf`);
    }
}

// Customer Category Management
function showAddCustProvinceModal() {
    document.getElementById('custProvinceModalTitle').textContent = '➕ Add Province';
    document.getElementById('editCustProvinceId').value = '';
    document.getElementById('custProvinceName').value = '';
    document.getElementById('addCustProvinceModal').style.display = 'block';
}

function closeAddCustProvinceModal() {
    document.getElementById('addCustProvinceModal').style.display = 'none';
}

function editCustProvince(id) {
    let p = customerProvinces.find(x => x.id == id);
    if (p) {
        document.getElementById('custProvinceModalTitle').textContent = '✏️ Edit Province';
        document.getElementById('editCustProvinceId').value = p.id;
        document.getElementById('custProvinceName').value = p.name;
        document.getElementById('addCustProvinceModal').style.display = 'block';
    }
}

async function saveCustProvince() {
    let id = document.getElementById('editCustProvinceId').value;
    let name = document.getElementById('custProvinceName').value;
    if (!name) { alert('Enter province name'); return; }

    try {
        const response = await fetch('api/sync.php?action=save_cust_category', {
            method: 'POST',
            body: JSON.stringify({ type: 'main', category: { id, name } })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (id) {
                let p = customerProvinces.find(x => x.id == id);
                if (p) p.name = name;
            } else {
                customerProvinces.push({ id: result.id, name });
            }
            saveData();
            refreshCustomersList();
            closeAddCustProvinceModal();
            alert('Province saved!');
        } else { alert('Error: ' + result.message); }
    } catch (e) { alert('Sync failed.'); }
}

async function deleteCustProvince(id) {
    if (confirm('Delete this province?')) {
        try {
            const response = await fetch('api/sync.php?action=delete_cust_category', {
                method: 'POST',
                body: JSON.stringify({ id, type: 'main' })
            });
            const result = await response.json();
            if (result.status === 'success') {
                customerProvinces = customerProvinces.filter(p => p.id != id);
                saveData();
                refreshCustomersList();
                alert('Province deleted!');
            } else { alert(result.message); }
        } catch (e) { alert('Sync failed.'); }
    }
}

function showAddCustDistrictModalFor(provId) {
    showAddCustDistrictModal();
    document.getElementById('custDistrictProvinceSelect').value = provId;
}

function showAddCustDistrictModal() {
    if (customerProvinces.length === 0) { alert('Add a province first!'); return; }
    populateProvinceSelect('custDistrictProvinceSelect');
    document.getElementById('custDistrictModalTitle').textContent = '➕ Add District';
    document.getElementById('editCustDistrictId').value = '';
    document.getElementById('custDistrictName').value = '';
    document.getElementById('addCustDistrictModal').style.display = 'block';
}

function closeAddCustDistrictModal() {
    document.getElementById('addCustDistrictModal').style.display = 'none';
}

function editCustDistrict(id) {
    let d = customerDistricts.find(x => x.id == id);
    if (d) {
        populateProvinceSelect('custDistrictProvinceSelect');
        document.getElementById('custDistrictModalTitle').textContent = '✏️ Edit District';
        document.getElementById('editCustDistrictId').value = d.id;
        document.getElementById('custDistrictName').value = d.name;
        document.getElementById('custDistrictProvinceSelect').value = d.mainId;
        document.getElementById('addCustDistrictModal').style.display = 'block';
    }
}

async function saveCustDistrict() {
    let id = document.getElementById('editCustDistrictId').value;
    let mainId = document.getElementById('custDistrictProvinceSelect').value;
    let name = document.getElementById('custDistrictName').value;
    if (!name || !mainId) { alert('Fill all fields'); return; }

    try {
        const response = await fetch('api/sync.php?action=save_cust_category', {
            method: 'POST',
            body: JSON.stringify({ type: 'sub', category: { id, mainId, name } })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (id) {
                let d = customerDistricts.find(x => x.id == id);
                if (d) { d.name = name; d.mainId = mainId; }
            } else {
                customerDistricts.push({ id: result.id, mainId, name });
            }
            saveData();
            refreshCustomersList();
            closeAddCustDistrictModal();
            alert('District saved!');
        } else { alert('Error: ' + result.message); }
    } catch (e) { alert('Sync failed.'); }
}

async function deleteCustDistrict(id) {
    if (confirm('Delete this district?')) {
        try {
            const response = await fetch('api/sync.php?action=delete_cust_category', {
                method: 'POST',
                body: JSON.stringify({ id, type: 'sub' })
            });
            const result = await response.json();
            if (result.status === 'success') {
                customerDistricts = customerDistricts.filter(d => d.id != id);
                saveData();
                refreshCustomersList();
                alert('District deleted!');
            } else { alert(result.message); }
        } catch (e) { alert('Sync failed.'); }
    }
}

// Initialize
initApp();

function updateGrandAuditTotal() {
    let gSysPcs = 0, gSysKg = 0;
    let gGdPcs = 0, gGdKg = 0;
    let gDiffPcs = 0, gDiffKg = 0;

    mainCategories.forEach(m => {
        const sysPcs = parseInt(document.getElementById(`totalSysPcs_${m.id}`)?.textContent) || 0;
        const sysKg = parseFloat(document.getElementById(`totalSysKg_${m.id}`)?.textContent) || 0;
        const gdPcs = parseInt(document.getElementById(`totalGodownPcs_${m.id}`)?.textContent) || 0;
        const gdKg = parseFloat(document.getElementById(`totalGodownKg_${m.id}`)?.textContent) || 0;
        const diffPcsText = document.getElementById(`totalDiffPcs_${m.id}`)?.textContent || '0';
        const diffKgText = document.getElementById(`totalDiffKg_${m.id}`)?.textContent || '0';
        
        const diffPcs = parseInt(diffPcsText.replace(/\+/g, '')) || 0;
        const diffKg = parseFloat(diffKgText.replace(/\+/g, '')) || 0;

        gSysPcs += sysPcs;
        gSysKg += sysKg;
        gGdPcs += gdPcs;
        gGdKg += gdKg;
        gDiffPcs += diffPcs;
        gDiffKg += diffKg;
    });

    const elSysPcs = document.getElementById('grandTotalSysPcs');
    const elSysKg = document.getElementById('grandTotalSysKg');
    const elGdPcs = document.getElementById('grandTotalGodownPcs');
    const elGdKg = document.getElementById('grandTotalGodownKg');
    const elDiffPcs = document.getElementById('grandTotalDiffPcs');
    const elDiffKg = document.getElementById('grandTotalDiffKg');

    if (elSysPcs) elSysPcs.textContent = gSysPcs;
    if (elSysKg) elSysKg.textContent = gSysKg.toFixed(2);
    if (elGdPcs) elGdPcs.textContent = gGdPcs;
    if (elGdKg) elGdKg.textContent = gGdKg.toFixed(2);
    
    if (elDiffPcs) {
        elDiffPcs.textContent = (gDiffPcs > 0 ? '+' : '') + gDiffPcs;
        elDiffPcs.className = gDiffPcs === 0 ? '' : (gDiffPcs > 0 ? 'diff-plus' : 'diff-minus');
    }
    if (elDiffKg) {
        elDiffKg.textContent = (gDiffKg > 0 ? '+' : '') + gDiffKg.toFixed(2);
        elDiffKg.className = gDiffKg === 0 ? '' : (gDiffKg > 0 ? 'diff-plus' : 'diff-minus');
    }
}

// PRODUCTION REPORT FUNCTIONS
function showProductionReportModal() {
    const today = new Date().toISOString().split('T')[0];
    const elFrom = document.getElementById('prodReportFrom');
    const elTo = document.getElementById('prodReportTo');
    const elBrand = document.getElementById('prodReportBrandSelect');
    
    if (elFrom) elFrom.value = today;
    if (elTo) elTo.value = today;
    
    if (elBrand) {
        let options = '<option value="all">-- All Brands --</option>';
        mainCategories.forEach(m => {
            options += `<option value="${m.id}">${m.name}</option>`;
        });
        elBrand.innerHTML = options;
    }
    
    document.getElementById('prodReportContent').innerHTML = `
        <div style="text-align: center; color: var(--gray-400); padding: 7rem 0;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
            <p>Select filters and click Search to generate the production report.</p>
        </div>
    `;
    document.getElementById('prodReportModal').style.display = 'block';
}

function closeProdReportModal() {
    document.getElementById('prodReportModal').style.display = 'none';
}

function generateProductionReport() {
    const fromDate = document.getElementById('prodReportFrom').value;
    const toDate = document.getElementById('prodReportTo').value;
    const brandId = document.getElementById('prodReportBrandSelect').value;
    
    if (!fromDate || !toDate) { alert("Please select date range."); return; }
    
    // Use a robust local date parser to avoid UTC shifts
    const parseLocal = (dStr) => {
        const [y, m, d] = dStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const start = parseLocal(fromDate).setHours(0,0,0,0);
    const end = parseLocal(toDate).setHours(23,59,59,999);
    
    const filtered = transactions.filter(t => {
        if (t.type !== 'IN') return false;
        const tDate = new Date(t.date).getTime();
        const dateMatch = tDate >= start && tDate <= end;
        const brandMatch = brandId === 'all' || t.mainId == brandId;
        return dateMatch && brandMatch;
    });
    
    if (filtered.length === 0) {
        document.getElementById('prodReportContent').innerHTML = `<p style="text-align:center; padding:5rem; color:var(--gray-400);">No production data found for this selection.</p>`;
        return;
    }
    
    // Group by brand
    const grouped = {};
    filtered.forEach(t => {
        if (!grouped[t.mainName]) grouped[t.mainName] = [];
        grouped[t.mainName].push(t);
    });
    
    let html = `
        <div style="margin-bottom: 2rem; text-align: center; border-bottom: 3px solid var(--sky-600); padding-bottom: 1rem;">
             <h2 style="margin: 0; color: var(--sky-600);">Production Summary Report</h2>
             <p style="margin: 5px 0 0 0; color: var(--gray-500); font-weight: 500;">Report Period: ${fromDate} to ${toDate}</p>
        </div>
    `;
    
    let grandPcs = 0;
    let grandKg = 0;
    let grandValue = 0;
    
    Object.keys(grouped).sort().forEach(brandName => {
        const brandEntries = grouped[brandName];
        const currentBrandId = brandEntries[0].mainId;
        
        // Calculate Total RM Cost for this brand in the period
        const brandRMTransactions = rmTransactions.filter(t => {
            // Loose comparison for brand_id to handle string/number mismatch
            if (t.type !== 'OUT' || !t.brand_id || t.brand_id != currentBrandId) return false;
            
            // Handle date matching robustly
            const tDate = new Date(t.date).getTime();
            return tDate >= start && tDate <= end;
        });
        
        // Debugging logs to console to help find issues
        if (brandRMTransactions.length > 0) {
            console.log(`Report Debug [${brandName}]: Found ${brandRMTransactions.length} RM transactions.`);
        }

        const totalRMCost = brandRMTransactions.reduce((sum, t) => {
            const price = parseFloat(t.price || 0);
            if (price <= 0) console.warn(`Item ${t.rm_item_id} has 0 price in RM history.`);
            return sum + (parseFloat(t.quantity) * price);
        }, 0);
        
        // Calculate Total FG KG for the rate
        let bPcs = 0;
        let bKg = 0;
        brandEntries.forEach(t => {
            const w = parseFloat(t.weight || t.itemWeight) || 0;
            const q = parseInt(t.quantity) || 0;
            bKg += (w * q);
            bPcs += q;
        });
        
        const brandRate = bKg > 0 ? (totalRMCost / bKg) : 0;

        html += `<div class="audit-group" style="margin-bottom: 2.5rem;">
            <div style="background: var(--gray-800); color: white; padding: 0.8rem 1.2rem; border-radius: 8px 8px 0 0; font-weight: 600; font-size: 1.1rem; display: flex; justify-content: space-between;">
                <span>Brand: ${brandName}</span>
                <span>${totalRMCost > 0 ? `Total RM Cost: ${totalRMCost.toFixed(2)} | Rate: ${brandRate.toFixed(2)}/KG` : 'No Formula Cost Linked'}</span>
            </div>
            <table class="audit-table" style="width: 100%; border-collapse: collapse; background: white; border: 1px solid var(--gray-200);">
                <thead>
                    <tr style="background: var(--gray-50); font-size: 0.85rem;">
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Date</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200); text-align: left;">Product (Size)</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Length</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Unit KG</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Qty (Pcs)</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200);">Total KG</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200); background: #f0f9ff; color: #0369a1;">Rate/KG</th>
                        <th style="padding: 0.8rem; border: 1px solid var(--gray-200); background: #f0f9ff; color: #0369a1;">Total Value</th>
                    </tr>
                </thead>
                <tbody>`;
        
        brandEntries.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(t => {
            const w = parseFloat(t.weight || t.itemWeight) || 0;
            const q = parseInt(t.quantity) || 0;
            const entryKg = w * q;
            const entryValue = entryKg * brandRate;
            
            html += `<tr style="font-size: 0.9rem;">
                <td style="padding: 0.7rem; border: 1px solid var(--gray-200); text-align: center; color: var(--gray-500);">${new Date(t.date).toLocaleDateString()}</td>
                <td style="padding: 0.7rem; border: 1px solid var(--gray-200); text-align: left; font-weight: 500;">${t.subName} (${t.itemName})</td>
                <td style="padding: 0.7rem; border: 1px solid var(--gray-200); text-align: center;">${t.itemLength || '-'} ft</td>
                <td style="padding: 0.7rem; border: 1px solid var(--gray-200); text-align: center;">${w.toFixed(2)}</td>
                <td style="padding: 0.7rem; border: 1px solid var(--gray-200); text-align: center; font-weight: 700;">${q}</td>
                <td style="padding: 0.7rem; border: 1px solid var(--gray-200); text-align: center; font-weight: 700; color: var(--sky-600);">${entryKg.toFixed(2)}</td>
                <td style="padding: 0.7rem; border: 1px solid var(--gray-200); text-align: center; color: #0369a1;">${brandRate.toFixed(2)}</td>
                <td style="padding: 0.7rem; border: 1px solid var(--gray-200); text-align: center; font-weight: 700; color: #0369a1;">${entryValue.toFixed(2)}</td>
            </tr>`;
        });
        
        grandPcs += bPcs;
        grandKg += bKg;
        grandValue += totalRMCost;
        
        html += `</tbody>
            <tfoot style="background: var(--sky-50); font-weight: 800; font-size: 1rem;">
                <tr>
                    <td colspan="4" style="text-align: right; padding: 0.8rem; border: 1px solid var(--gray-200);">${brandName} Totals:</td>
                    <td style="text-align: center; border: 1px solid var(--gray-200); color: var(--gray-900);">${bPcs}</td>
                    <td style="text-align: center; border: 1px solid var(--gray-200); color: var(--sky-700);">${bKg.toFixed(2)}</td>
                    <td style="text-align: right; padding: 0.8rem; border: 1px solid var(--gray-200); color: #0369a1;">Total Value:</td>
                    <td style="text-align: center; border: 1px solid var(--gray-200); color: #0369a1; background: #e0f2fe;">${totalRMCost.toFixed(2)}</td>
                </tr>
            </tfoot>
        </table></div>`;
    });
    
    // Grand Summary with Cost Analysis
    html += `
        <div style="margin-top: 2rem; background: white; color: var(--gray-800); padding: 1.5rem; border-radius: 12px; border: 2px solid var(--sky-500); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--gray-100); padding-bottom: 0.8rem; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; letter-spacing: 0.5px; font-size: 1.2rem; color: var(--gray-800); font-weight: 800;">🚀 OVERALL PRODUCTION SUMMARY</h3>
                <span style="font-size: 0.75rem; color: var(--gray-400); font-weight: 600;">Generated: ${new Date().toLocaleString()}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem;">
                <div style="background: #f8fafc; padding: 1rem; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
                    <label style="display: block; font-size: 0.7rem; margin-bottom: 0.5rem; color: var(--gray-500); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Pieces</label>
                    <strong style="font-size: 1.6rem; color: var(--gray-900);">${grandPcs.toLocaleString()}</strong>
                    <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 2px;">Pcs</div>
                </div>
                <div style="background: #f8fafc; padding: 1rem; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
                    <label style="display: block; font-size: 0.7rem; margin-bottom: 0.5rem; color: var(--gray-500); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Weight</label>
                    <strong style="font-size: 1.6rem; color: var(--sky-700);">${grandKg.toLocaleString(undefined, {minimumFractionDigits: 1})}</strong>
                    <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 2px;">KG</div>
                </div>
                <div style="background: #f0f9ff; padding: 1rem; border-radius: 10px; border: 1px solid #bae6fd; text-align: center;">
                    <label style="display: block; font-size: 0.7rem; margin-bottom: 0.5rem; color: #0369a1; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">RM Total Value</label>
                    <strong id="summaryRMValue" data-value="${grandValue}" style="font-size: 1.6rem; color: #0369a1;">${grandValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong>
                    <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 2px;">Rs.</div>
                </div>
                <div style="background: #fffbeb; padding: 1rem; border-radius: 10px; border: 1px solid #fef3c7; text-align: center;">
                    <label style="display: block; font-size: 0.7rem; margin-bottom: 0.5rem; color: #b45309; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Other Expenses</label>
                    <input type="number" id="summaryOtherExpenses" value="0" oninput="updateReportNetValue()" style="width: 100%; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 8px; font-size: 1.2rem; font-weight: 800; text-align: center; color: #b45309; background: white;">
                    <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 2px;">(Labor, Power, etc.)</div>
                </div>
                <div style="background: #f0fdf4; padding: 1rem; border-radius: 10px; border: 1px solid #dcfce7; text-align: center;">
                    <label style="display: block; font-size: 0.7rem; margin-bottom: 0.5rem; color: #15803d; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Total Net Value</label>
                    <strong id="summaryNetValue" style="font-size: 1.6rem; color: #15803d;">${grandValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong>
                    <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 2px;">Rs. Total Cost</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('prodReportContent').innerHTML = html;
}

// Helper to update net value in report summary
function updateReportNetValue() {
    const rmValueEl = document.getElementById('summaryRMValue');
    const expensesEl = document.getElementById('summaryOtherExpenses');
    const netEl = document.getElementById('summaryNetValue');
    
    if (!rmValueEl || !expensesEl || !netEl) return;
    
    const rmVal = parseFloat(rmValueEl.getAttribute('data-value')) || 0;
    const expenses = parseFloat(expensesEl.value) || 0;
    const total = rmVal + expenses;
    
    netEl.innerText = total.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
}

function exportProductionReport(format) {
    const fromDate = document.getElementById('prodReportFrom').value;
    const toDate = document.getElementById('prodReportTo').value;
    const brandId = document.getElementById('prodReportBrandSelect').value;
    
    const start = new Date(fromDate).setHours(0,0,0,0);
    const end = new Date(toDate).setHours(23,59,59,999);
    
    const filtered = transactions.filter(t => {
        if (t.type !== 'IN') return false;
        const tDate = new Date(t.date).getTime();
        const dateMatch = tDate >= start && tDate <= end;
        const brandMatch = brandId === 'all' || t.mainId == brandId;
        return dateMatch && brandMatch;
    });

    if (filtered.length === 0) { alert("No data to export!"); return; }

    const reportData = filtered.map(t => ({
        "Date": new Date(t.date).toLocaleDateString(),
        "Brand": t.mainName,
        "Product": `${t.subName} (${t.itemName})`,
        "Length": t.itemLength || '-',
        "Unit KG": parseFloat(t.itemWeight) || 0,
        "Qty": parseInt(t.quantity) || 0,
        "Total KG": (parseFloat(t.itemWeight) || 0) * (parseInt(t.quantity) || 0)
    }));

    if (format === 'excel') {
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Production");
        XLSX.writeFile(wb, `Production_Report_${fromDate}_to_${toDate}.xlsx`);
    }
}

async function updateDateFormat() {
    const newFormat = document.getElementById('systemDateFormat').value;
    if (!newFormat) return;
    
    window.systemDateFormat = newFormat;
    
    try {
        const response = await fetch('api/sync.php?action=save_settings', {
            method: 'POST',
            body: JSON.stringify({
                category: 'system',
                settings: { date_format: newFormat }
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            console.log('StockFlow: Date format updated successfully');
            // Refresh views
            refreshTransactions();
            refreshDashboard();
            if (typeof refreshOrders === 'function') refreshOrders();
            refreshStockList();
            refreshLowStockReport();
        }
    } catch (e) {
        console.error('StockFlow: Failed to save date format:', e);
    }
}

// ==================== RAW MATERIALS MODULE LOGIC ====================

function refreshRMDashboard() {
    console.log('StockFlow: Refreshing RM Dashboard...');
    const totalItems = rmItems.length;
    let lowStockCount = 0;
    let totalBags = 0;
    let totalWeight = 0;
    
    let summaryHtml = '';
    let alertsHtml = '';

    rmItems.forEach(item => {
        const stock = parseFloat(item.stock) || 0;
        const threshold = parseFloat(item.threshold) || 0;
        const thresholdUnit = item.thresholdUnit || 'KG';
        const kgPerBag = parseFloat(item.kgPerBag) || 0;
        
        let actualThresholdKg = threshold;
        if (thresholdUnit === 'Bags' && kgPerBag > 0) {
            actualThresholdKg = threshold * kgPerBag;
        }

        const isLow = stock <= actualThresholdKg;
        
        totalWeight += stock;
        
        if (kgPerBag > 0) {
            totalBags += stock / kgPerBag;
        }

        // Inventory Summary Cards - Consistent sizing for KG and Bags
        const bagsVal = kgPerBag > 0 ? (stock / kgPerBag).toFixed(1) : '---';
        const bagsDisplay = kgPerBag > 0 ? `
            <div style="font-weight: 800; color: var(--primary); font-size: 1.15rem;">
                ${bagsVal} <span style="font-size: 0.75rem; color: var(--gray-400); font-weight:600;">Bags</span>
            </div>` : '';
        
        summaryHtml += `
            <div style="background: white; border: 1px solid var(--gray-100); padding: 12px 18px; border-radius: 12px; margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.03); transition: 0.2s; border-left: 5px solid var(--sky-400);">
                <div>
                    <div style="font-weight: 700; color: var(--gray-800); font-size: 1.05rem;">${item.name}</div>
                    <div style="font-size: 0.8rem; color: var(--gray-500); margin-top: 3px; font-family: monospace;">${item.code}</div>
                </div>
                <div style="display: flex; gap: 2rem; align-items: center; text-align: right;">
                    <div style="min-width: 100px;">
                        <div style="font-weight: 800; color: var(--sky-700); font-size: 1.15rem;">
                            ${stock.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span style="font-size: 0.75rem; color: var(--gray-400); font-weight:600;">${item.unit}</span>
                        </div>
                        ${bagsDisplay}
                    </div>
                </div>
            </div>`;

        if (isLow) {
            lowStockCount++;
            alertsHtml += `
                <div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 10px 15px; border-radius: 10px; margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 700; color: #c53030; font-size: 0.95rem;">${item.name}</div>
                        <div style="font-size: 0.8rem; color: #9b2c2c; opacity: 0.8;">Current: ${stock} / Min: ${threshold} ${thresholdUnit}</div>
                    </div>
                    <div style="background: #fc8181; color: white; padding: 4px 10px; border-radius: 50px; font-weight: 800; font-size: 0.8rem;">REORDER</div>
                </div>`;
        }
    });

    if (rmItems.length === 0) summaryHtml = '<div style="text-align: center; padding: 3rem; color: var(--gray-400);">No materials found in inventory.</div>';
    if (!alertsHtml) alertsHtml = '<div style="text-align: center; padding: 3rem; color: var(--gray-400); font-style: italic;">✅ All stocks are healthy.</div>';

    if (document.getElementById('rmTotalItems')) document.getElementById('rmTotalItems').innerText = totalItems;
    if (document.getElementById('rmLowStockCount')) document.getElementById('rmLowStockCount').innerText = lowStockCount;
    if (document.getElementById('rmTotalWeightKg')) document.getElementById('rmTotalWeightKg').innerText = totalWeight.toLocaleString(undefined, {maximumFractionDigits: 1}) + ' KG';
    
    if (document.getElementById('rmInventorySummary')) document.getElementById('rmInventorySummary').innerHTML = summaryHtml;
    if (document.getElementById('rmLowStockAlerts')) document.getElementById('rmLowStockAlerts').innerHTML = alertsHtml;
}

function refreshRMInventory() {
    console.log('StockFlow: Refreshing RM Hierarchical Inventory...');
    const container = document.getElementById('rmInventoryContainer');
    if (!container) return;

    if (rmMainCategories.length === 0) {
        container.innerHTML = '<div class="table-container"><p style="text-align:center; padding:2rem; color:var(--gray-500);">No RM Categories established. Start by adding a Main Category.</p></div>';
        return;
    }

    let html = '';
    rmMainCategories.sort((a,b) => a.code.localeCompare(b.code)).forEach(main => {
        const isExpanded = rmExpandedIds.has(`main_${main.id}`);
        html += `
        <div class="brand-group" style="margin-bottom: 2rem; border: 1px solid var(--sky-200); border-radius: 10px; overflow: hidden; background: white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div class="brand-header" style="background: var(--sky-600); color: white; padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleRMCollapse('main_${main.id}')">
                <div style="display: flex; align-items: center; gap: 1.2rem;">
                    <span style="font-size: 1.4rem;">${isExpanded ? '📂' : '📁'}</span>
                    <div>
                        <div style="font-weight: 800; font-size: 1.2rem; letter-spacing: 0.5px;">${main.name}</div>
                        <div style="color: rgba(255,255,255,0.8); font-family: monospace; font-size: 0.9rem; font-weight: 600;">Code: ${main.code}</div>
                    </div>
                </div>
                <div class="actions" style="display: flex; gap: 0.6rem;" onclick="event.stopPropagation()">
                    <button class="btn btn-sm" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4);" onclick="showAddRMSubCategoryModal(${main.id})" title="Add Sub-Category">➕ Sub</button>
                    <button class="btn btn-sm" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4);" onclick="editRMMain(${main.id})" title="Edit Category">✏️</button>
                    <button class="btn btn-sm" style="background: rgba(255,100,100,0.3); color: white; border: 1px solid rgba(255,255,255,0.4);" onclick="deleteRMMain(${main.id})" title="Delete Category">🗑️</button>
                </div>
            </div>
            <div class="sub-categories-list" style="padding: 1.2rem; background: #f8fafc; ${isExpanded ? '' : 'display: none;'}">`;

        const subs = rmSubCategories.filter(s => s.mainId == main.id).sort((a,b) => a.code.localeCompare(b.code));
        if (subs.length === 0) {
            html += `<p style="color: var(--gray-400); font-style: italic; font-size: 0.95rem; padding: 1rem; background: white; border-radius: 8px; border: 1px dashed var(--gray-200);">No sub-categories in this category.</p>`;
        } else {
            subs.forEach(sub => {
                const isSubExpanded = rmExpandedIds.has(`sub_${sub.id}`);
                html += `
                <div class="sub-category-item" style="margin-bottom: 1.2rem; border: 1px solid var(--gray-200); border-radius: 8px; background: white; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1.2rem; background: #edf2f7; border-bottom: 1px solid var(--gray-200); cursor: pointer;" onclick="toggleRMCollapse('sub_${sub.id}')">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <span style="color: var(--sky-600); font-weight: bold;">${isSubExpanded ? '➖' : '➕'}</span>
                            <div>
                                <span style="font-weight: 700; color: var(--gray-800); font-size: 1.05rem;">${sub.name}</span>
                                <span style="margin-left: 0.8rem; color: var(--gray-500); font-family: monospace; font-size: 0.85rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${sub.code}</span>
                            </div>
                        </div>
                        <div class="actions" style="display: flex; gap: 0.5rem;" onclick="event.stopPropagation()">
                            <button class="btn btn-sm btn-primary" style="padding: 3px 10px; font-size: 0.85rem; font-weight: 600;" onclick="showAddRMItemModal(${sub.id})" title="Add Item">➕ Item</button>
                            <button class="btn btn-icon btn-sm" style="background: white;" onclick="editRMSub(${sub.id})">✏️</button>
                            <button class="btn btn-icon btn-sm text-error" style="background: white;" onclick="deleteRMSub(${sub.id})">🗑️</button>
                        </div>
                    </div>
                    <div style="${isSubExpanded ? '' : 'display: none;'}">
                        <table class="data-table" style="font-size: 0.9rem; margin: 0; border: none; width: 100%;">
                            <thead>
                                <tr style="background: #f1f5f9; border-bottom: 2px solid var(--gray-200);">
                                    <th style="padding: 0.7rem 1.2rem; font-weight: 700; color: var(--gray-700);">Item Name</th>
                                    <th style="font-weight: 700; color: var(--gray-700);">Code</th>
                                    <th style="font-weight: 700; color: var(--gray-700);">Stock</th>
                                    <th style="font-weight: 700; color: var(--gray-700);">Unit</th>
                                    <th style="font-weight: 700; color: var(--gray-700);">Threshold</th>
                                    <th style="width: 110px; text-align: center; font-weight: 700; color: var(--gray-700);">Actions</th>
                                </tr>
                            </thead>
                            <tbody style="background: white;">`;
                
                const itemsList = rmItems.filter(i => i.subId == sub.id).sort((a,b) => a.code.localeCompare(b.code));
                if (itemsList.length === 0) {
                    html += `<tr><td colspan="6" style="text-align:center; color: var(--gray-400); padding: 2rem;">No items added yet.</td></tr>`;
                } else {
                    itemsList.forEach(item => {
                        const isLow = parseFloat(item.stock) <= parseFloat(item.threshold);
                        html += `
                        <tr style="border-bottom: 1px solid var(--gray-100);">
                            <td style="font-weight: 600; padding: 0.7rem 1.2rem; color: var(--gray-800);">${item.name}</td>
                            <td style="font-family: monospace; color: var(--gray-600); font-weight: 500;">${item.code}</td>
                            <td><span class="badge ${isLow ? 'badge-error' : 'badge-success'}" style="font-size: 0.85rem; padding: 4px 10px; font-weight: bold;">${item.stock}</span></td>
                            <td style="font-weight: 500; color: var(--gray-600);">${item.unit}</td>
                            <td style="color: var(--gray-500);">${item.threshold}</td>
                            <td style="text-align: center; padding: 0.5rem;">
                                <div style="display: flex; justify-content: center; gap: 0.4rem;">
                                    <button class="btn-icon" style="padding: 4px; background: #f8fafc; border: 1px solid var(--gray-200);" onclick="editRMItem(${item.id})">✏️</button>
                                    <button class="btn-icon text-error" style="padding: 4px; background: #f8fafc; border: 1px solid var(--gray-200);" onclick="deleteRMItem(${item.id})">🗑️</button>
                                </div>
                            </td>
                        </tr>`;
                    });
                }
                html += `</tbody></table></div></div>`;
            });
        }
        html += `</div></div>`;
    });

    container.innerHTML = html;
}

function toggleRMCollapse(id) {
    if (rmExpandedIds.has(id)) {
        rmExpandedIds.delete(id);
    } else {
        rmExpandedIds.add(id);
    }
    refreshRMInventory();
}

// ==================== RM MODAL FUNCTIONS ====================

function showAddRMMainCategoryModal() {
    document.getElementById('editRMMainCategoryId').value = '';
    document.getElementById('rmMainCategoryName').value = '';
    document.getElementById('rmMainCategoryCode').value = '';
    document.getElementById('rmMainCategoryModalTitle').innerText = '➕ Add RM Brand';
    document.getElementById('addRMMainCategoryModal').style.display = 'block';
}

function closeAddRMMainCategoryModal() { document.getElementById('addRMMainCategoryModal').style.display = 'none'; }

async function saveRMMainCategory() {
    const id = document.getElementById('editRMMainCategoryId').value;
    const name = document.getElementById('rmMainCategoryName').value;
    const code = document.getElementById('rmMainCategoryCode').value;

    if (!name || !code) { alert('Please fill all fields'); return; }

    const response = await fetch('api/sync.php?action=save_rm_main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ main: { id, name, code } })
    });
    const result = await response.json();
    if (result.status === 'success') {
        initApp();
        closeAddRMMainCategoryModal();
    }
}

function showAddRMSubCategoryModal(mainId) {
    document.getElementById('editRMSubCategoryId').value = '';
    const mainSelect = document.getElementById('rmSubCategoryMainSelect');
    mainSelect.innerHTML = '';
    rmMainCategories.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = m.name;
        if (m.id == mainId) opt.selected = true;
        mainSelect.appendChild(opt);
    });
    document.getElementById('rmSubCategoryName').value = '';
    
    // Auto-generate Sub Code with Gap Filling logic
    const main = rmMainCategories.find(m => m.id == mainId);
    const prefix = main ? main.code : 'RM-';
    const existingCodes = rmSubCategories.filter(s => s.mainId == mainId).map(s => s.code);
    
    // Find first available number that isn't already used
    const usedNums = existingCodes
        .filter(c => c.startsWith(prefix))
        .map(c => parseInt(c.slice(prefix.length)))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

    let nextNum = 1;
    for (const num of usedNums) {
        if (num === nextNum) {
            nextNum++;
        } else if (num > nextNum) {
            break;
        }
    }

    // Defensive check: Ensure the final code is truly unique
    let finalCode = prefix + String(nextNum).padStart(3, '0');
    while (existingCodes.includes(finalCode)) {
        nextNum++;
        finalCode = prefix + String(nextNum).padStart(3, '0');
    }
    document.getElementById('rmSubCategoryCode').value = finalCode;
    
    document.getElementById('rmSubCategoryModalTitle').innerText = '➕ Add RM Sub-Category';
    document.getElementById('addRMSubCategoryModal').style.display = 'block';
}

function closeAddRMSubCategoryModal() { document.getElementById('addRMSubCategoryModal').style.display = 'none'; }

async function saveRMSubCategory() {
    const id = document.getElementById('editRMSubCategoryId').value;
    const mainId = document.getElementById('rmSubCategoryMainSelect').value;
    const name = document.getElementById('rmSubCategoryName').value;
    const code = document.getElementById('rmSubCategoryCode').value;

    if (!name || !code) { alert('Please fill all fields'); return; }

    const response = await fetch('api/sync.php?action=save_rm_sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sub: { id, mainId, name, code } })
    });
    const result = await response.json();
    if (result.status === 'success') {
        initApp();
        closeAddRMSubCategoryModal();
    }
}

function showAddRMItemModal(subId) {
    document.getElementById('editRMItemId').value = '';
    document.getElementById('rmItemSubId').value = subId;
    document.getElementById('rmItemName').value = '';
    
    // Auto-generate Item Code with Gap Filling logic
    const sub = rmSubCategories.find(s => s.id == subId);
    const prefix = sub ? sub.code : 'RM-XXXXX';
    const existingCodes = rmItems.filter(i => i.subId == subId).map(i => i.code);

    const usedNums = existingCodes
        .filter(c => c.startsWith(prefix))
        .map(c => parseInt(c.slice(prefix.length)))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);

    let nextNum = 1;
    for (const num of usedNums) {
        if (num === nextNum) {
            nextNum++;
        } else if (num > nextNum) {
            break;
        }
    }

    // Defensive check: Ensure the final code is truly unique
    let finalCode = prefix + String(nextNum).padStart(4, '0');
    while (existingCodes.includes(finalCode)) {
        nextNum++;
        finalCode = prefix + String(nextNum).padStart(4, '0');
    }
    document.getElementById('rmItemCode').value = finalCode;
    
    // Units populate
    const unitSelect = document.getElementById('rmItemUnit');
    unitSelect.innerHTML = '<option value="">Select Unit...</option>';
    rmUnits.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.name;
        opt.innerText = u.name;
        unitSelect.appendChild(opt);
    });
    if (document.getElementById('rmItemStockUnit')) document.getElementById('rmItemStockUnit').value = 'Bags';
    if (document.getElementById('rmItemThresholdUnit')) document.getElementById('rmItemThresholdUnit').value = 'Bags';

    document.getElementById('rmItemStock').value = 0;
    document.getElementById('rmItemThreshold').value = 0;
    document.getElementById('rmItemKgPerBag').value = 0;
    document.getElementById('rmItemModalTitle').innerText = '➕ Add RM Item';
    document.getElementById('addRMItemModal').style.display = 'block';
}

function closeAddRMItemModal() { document.getElementById('addRMItemModal').style.display = 'none'; }

async function saveRMItem() {
    const id = document.getElementById('editRMItemId').value;
    const subId = document.getElementById('rmItemSubId').value;
    const name = document.getElementById('rmItemName').value;
    const code = document.getElementById('rmItemCode').value;
    const unit = document.getElementById('rmItemUnit').value;
    const stockVal = parseFloat(document.getElementById('rmItemStock').value) || 0;
    const stockUnit = document.getElementById('rmItemStockUnit') ? document.getElementById('rmItemStockUnit').value : 'KG';
    const threshold = document.getElementById('rmItemThreshold').value;
    const kgPerBag = parseFloat(document.getElementById('rmItemKgPerBag').value) || 0;
    const thresholdUnit = document.getElementById('rmItemThresholdUnit').value;

    if (!name || !code || !unit) { alert('Please fill all required fields'); return; }

    // Convert Opening Stock to KG if needed
    let actualStockKg = stockVal;
    if (stockUnit === 'Bags' && kgPerBag > 0) {
        actualStockKg = stockVal * kgPerBag;
    } else if (stockUnit === 'Grams') {
        actualStockKg = stockVal / 1000;
    } else if (stockUnit === 'Bags' && kgPerBag <= 0 && stockVal > 0) {
        alert('Please set "KG per Bag" multiplier to use Bags for stock.');
        return;
    }

    const response = await fetch('api/sync.php?action=save_rm_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: { id, subId, name, code, unit, stock: actualStockKg, threshold, kg_per_bag: kgPerBag, threshold_unit: thresholdUnit } })
    });
    const result = await response.json();
    if (result.status === 'success') {
        initApp();
        closeAddRMItemModal();
    }
}

function showManageRMUnitsModal() {
    refreshRMUnitsList();
    document.getElementById('manageRMUnitsModal').style.display = 'block';
}

function closeManageRMUnitsModal() { document.getElementById('manageRMUnitsModal').style.display = 'none'; }

function refreshRMUnitsList() {
    const tbody = document.getElementById('rmUnitsListTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    rmUnits.forEach(u => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${u.name}</td>
            <td><button class="btn btn-icon text-error" onclick="deleteRMUnit(${u.id})">🗑️</button></td>
        `;
        tbody.appendChild(row);
    });
}

async function saveRMUnit() {
    const name = document.getElementById('newRMUnitName').value;
    if (!name) return;
    const response = await fetch('api/sync.php?action=save_rm_unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit: { name } })
    });
    const result = await response.json();
    if (result.status === 'success') {
        document.getElementById('newRMUnitName').value = '';
        initApp();
        setTimeout(refreshRMUnitsList, 500);
    }
}

async function deleteRMUnit(id) {
    if (!confirm('Are you sure you want to delete this unit?')) return;
    const response = await fetch('api/sync.php?action=delete_rm_unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if ((await response.json()).status === 'success') {
        initApp();
        setTimeout(refreshRMUnitsList, 500);
    }
}

// Edit/Delete handlers for RM hierarchy
async function editRMMain(id) {
    const m = rmMainCategories.find(x => x.id == id);
    if (!m) return;
    document.getElementById('editRMMainCategoryId').value = m.id;
    document.getElementById('rmMainCategoryName').value = m.name;
    document.getElementById('rmMainCategoryCode').value = m.code;
    document.getElementById('rmMainCategoryModalTitle').innerText = '✏️ Edit RM Brand';
    document.getElementById('addRMMainCategoryModal').style.display = 'block';
}

async function editRMSub(id) {
    const s = rmSubCategories.find(x => x.id == id);
    if (!s) return;
    document.getElementById('editRMSubCategoryId').value = s.id;
    
    const mainSelect = document.getElementById('rmSubCategoryMainSelect');
    mainSelect.innerHTML = '';
    rmMainCategories.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.innerText = m.name;
        if (m.id == s.mainId) opt.selected = true;
        mainSelect.appendChild(opt);
    });
    
    document.getElementById('rmSubCategoryName').value = s.name;
    document.getElementById('rmSubCategoryCode').value = s.code;
    document.getElementById('rmSubCategoryModalTitle').innerText = '✏️ Edit RM Sub-Category';
    document.getElementById('addRMSubCategoryModal').style.display = 'block';
}

async function editRMItem(id) {
    const item = rmItems.find(x => x.id == id);
    if (!item) return;
    document.getElementById('editRMItemId').value = item.id;
    document.getElementById('rmItemSubId').value = item.subId;
    document.getElementById('rmItemName').value = item.name;
    document.getElementById('rmItemCode').value = item.code;
    
    const unitSelect = document.getElementById('rmItemUnit');
    unitSelect.innerHTML = '<option value="">Select Unit...</option>';
    rmUnits.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.name;
        opt.innerText = u.name;
        if (u.name == item.unit) opt.selected = true;
        unitSelect.appendChild(opt);
    });
    
    document.getElementById('rmItemStock').value = item.stock;
    if (document.getElementById('rmItemStockUnit')) document.getElementById('rmItemStockUnit').value = 'KG'; // Always show KG when editing existing
    document.getElementById('rmItemThreshold').value = item.threshold;
    document.getElementById('rmItemKgPerBag').value = item.kgPerBag || 0;
    document.getElementById('rmItemThresholdUnit').value = item.thresholdUnit || 'Bags';
    document.getElementById('rmItemModalTitle').innerText = '✏️ Edit RM Item';
    document.getElementById('addRMItemModal').style.display = 'block';
}

async function deleteRMMain(id) {
    // Check if empty
    const hasSubs = rmSubCategories.some(s => s.mainId == id);
    if (hasSubs) {
        alert('Cannot delete category because it contains sub-categories. Please delete sub-categories first.');
        return;
    }

    if (!confirm('Are you sure you want to delete this main category?')) return;
    const response = await fetch('api/sync.php?action=delete_rm_main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if ((await response.json()).status === 'success') initApp();
}

async function deleteRMSub(id) {
    // Check if empty
    const hasItems = rmItems.some(i => i.subId == id);
    if (hasItems) {
        alert('Cannot delete sub-category because it contains items. Please delete items first.');
        return;
    }

    if (!confirm('Are you sure you want to delete this sub-category?')) return;
    const response = await fetch('api/sync.php?action=delete_rm_sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if ((await response.json()).status === 'success') initApp();
}

async function deleteRMItem(id) {
    if (!confirm('Delete this item?')) return;
    const response = await fetch('api/sync.php?action=delete_rm_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if ((await response.json()).status === 'success') initApp();
}

// ==================== RM FORMULA FUNCTIONS ====================

function refreshRMFormulas() {
    const container = document.getElementById('rmFormulasContainer');
    if (!container) return;

    if (rmFormulas.length === 0) {
        container.innerHTML = '<div class="table-container"><p style="text-align:center; padding:2rem; color:var(--gray-500);">No formulas defined. Click "+ Add New Formula" to start.</p></div>';
        return;
    }

    let html = `
    <div class="table-container">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Formula Name</th>
                    <th>Linked Brand</th>
                    <th>Composition (Ingredients)</th>
                    <th style="width: 120px;">Actions</th>
                </tr>
            </thead>
            <tbody>`;

    rmFormulas.sort((a,b) => a.name.localeCompare(b.name)).forEach(f => {
        const items = rmFormulaItems.filter(fi => fi.formula_id == f.id);
        let itemsHtml = '<ol style="margin:0; padding-left: 1.2rem; font-size: 0.85rem; color: var(--gray-700);">';
        items.forEach(fi => {
            const item = rmItems.find(i => i.id == fi.rm_item_id);
            itemsHtml += `<li><strong>${item ? item.name : 'Unknown'}</strong>: ${fi.quantity} ${item ? item.unit : ''}</li>`;
        });
        itemsHtml += '</ol>';

        const linkedBrand = mainCategories.find(m => m.id == f.main_id);
        const brandName = linkedBrand ? `<span class="badge" style="background:${linkedBrand.color || 'var(--sky-100)'}; color:${linkedBrand.color ? 'white' : 'var(--sky-700)'}; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem;">${linkedBrand.name}</span>` : '<span style="color:var(--gray-400); font-size:0.75rem;">Not Linked</span>';

        html += `
        <tr>
            <td style="font-weight: bold; color: var(--sky-700); font-size: 1.1rem;">${f.name}</td>
            <td>${brandName}</td>
            <td>${itemsHtml}</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                    <button class="btn btn-icon" onclick="editRMFormula(${f.id})">✏️</button>
                    <button class="btn btn-icon text-error" onclick="deleteRMFormula(${f.id})">🗑️</button>
                </div>
            </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function showAddRMFormulaModal() {
    document.getElementById('editRMFormulaId').value = '';
    document.getElementById('rmFormulaName').value = '';
    
    // Populate and reset brand selector
    const brandSelect = document.getElementById('rmFormulaBrand');
    if (brandSelect) {
        let options = '<option value="">-- No Brand Link --</option>';
        mainCategories.sort((a,b) => a.name.localeCompare(b.name)).forEach(m => {
            options += `<option value="${m.id}">${m.name}</option>`;
        });
        brandSelect.innerHTML = options;
        brandSelect.value = '';
    }

    document.getElementById('rmFormulaItemsContainer').innerHTML = '';
    document.getElementById('rmFormulaModalTitle').innerText = '➕ Add Production Formula';
    addRMFormulaItemRow(); // start with one row
    document.getElementById('addRMFormulaModal').style.display = 'block';
}

function closeAddRMFormulaModal() {
    document.getElementById('addRMFormulaModal').style.display = 'none';
}

function addRMFormulaItemRow(data = null) {
    const container = document.getElementById('rmFormulaItemsContainer');
    const rowId = 'row_' + Date.now() + Math.random().toString(36).substr(2, 5);
    
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'formula-item-row';
    row.style = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center; background: #f8fafc; padding: 0.5rem; border-radius: 4px; border: 1px solid #e2e8f0;';

    let options = '<option value="">-- Select Item --</option>';
    rmItems.sort((a,b) => a.name.localeCompare(b.name)).forEach(i => {
        options += `<option value="${i.id}" ${data && data.rm_item_id == i.id ? 'selected' : ''}>${i.name} (${i.unit})</option>`;
    });

    row.innerHTML = `
        <select class="form-control rm-item-select" style="flex: 2; font-size: 0.85rem;">${options}</select>
        <input type="number" class="form-control rm-item-qty" step="0.001" placeholder="Qty" value="${data ? data.quantity : ''}" style="flex: 1; font-size: 0.85rem;">
        <button class="btn btn-icon text-error" onclick="document.getElementById('${rowId}').remove()">✕</button>
    `;
    container.appendChild(row);
}

async function saveRMFormula() {
    const id = document.getElementById('editRMFormulaId').value;
    const name = document.getElementById('rmFormulaName').value.trim();
    const main_id = document.getElementById('rmFormulaBrand')?.value || null;
    if (!name) { alert('Please enter formula name'); return; }

    const rows = document.querySelectorAll('.formula-item-row');
    const items = [];
    rows.forEach(r => {
        const itemId = r.querySelector('.rm-item-select').value;
        const qty = r.querySelector('.rm-item-qty').value;
        if (itemId && qty > 0) {
            items.push({ rm_item_id: itemId, quantity: qty });
        }
    });

    if (items.length === 0) { alert('Add at least one item to formula'); return; }

    const response = await fetch('api/sync.php?action=save_rm_formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formula: { id, name, main_id }, items })
    });

    if ((await response.json()).status === 'success') {
        initApp();
        closeAddRMFormulaModal();
    }
}

function editRMFormula(id) {
    const f = rmFormulas.find(x => x.id == id);
    if (!f) return;
    
    // Ensure brand dropdown is populated before setting value
    const brandSelect = document.getElementById('rmFormulaBrand');
    if (brandSelect) {
        let options = '<option value="">-- No Brand Link --</option>';
        mainCategories.sort((a,b) => a.name.localeCompare(b.name)).forEach(m => {
            options += `<option value="${m.id}">${m.name}</option>`;
        });
        brandSelect.innerHTML = options;
        brandSelect.value = f.main_id || '';
    }

    document.getElementById('editRMFormulaId').value = f.id;
    document.getElementById('rmFormulaName').value = f.name;
    document.getElementById('rmFormulaModalTitle').innerText = '✏️ Edit Production Formula';
    
    const container = document.getElementById('rmFormulaItemsContainer');
    container.innerHTML = '';
    const items = rmFormulaItems.filter(fi => fi.formula_id == f.id);
    items.forEach(fi => addRMFormulaItemRow(fi));
    
    document.getElementById('addRMFormulaModal').style.display = 'block';
}

async function deleteRMFormula(id) {
    const pwd = prompt('Enter Admin Password to delete formula:');
    if (pwd !== 'admin123') {
        if (pwd !== null) alert('Incorrect password!');
        return;
    }
    if (!confirm('Are you sure you want to delete this formula? This will not affect past transactions.')) return;
    const response = await fetch('api/sync.php?action=delete_rm_formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if ((await response.json()).status === 'success') initApp();
}

// ==================== RM OUT LOGIC (FORMULAS) ====================

function setRMOutMode(mode) {
    // Update Radio
    const radio = document.querySelector(`input[name="rmOutMode"][value="${mode}"]`);
    if (radio) radio.checked = true;
    
    // Update UI Classes
    document.querySelectorAll('.mode-toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`modeBtn_${mode}`).classList.add('active');
    
    toggleRMOutMode();
}

function toggleRMOutMode() {
    const mode = document.querySelector('input[name="rmOutMode"]:checked').value;
    const singleGroup = document.getElementById('rmOutSingleGroup');
    const formulaGroup = document.getElementById('rmOutFormulaGroup');
    const qtyLabel = document.getElementById('rmOutQtyLabel');

    if (mode === 'SINGLE') {
        if (singleGroup) singleGroup.style.display = 'block';
        if (formulaGroup) formulaGroup.style.display = 'none';
        if (qtyLabel) qtyLabel.innerText = 'Quantity (Single Item)';
    } else {
        if (singleGroup) singleGroup.style.display = 'none';
        if (formulaGroup) formulaGroup.style.display = 'block';
        if (qtyLabel) qtyLabel.innerText = 'Multiplier (No. of Batches)';
    }
    
    // Hide formula editor initially
    const editor = document.getElementById('rmFormulaIngredientsEditor');
    if (editor) editor.style.display = 'none';

    refreshRMOutFormControls();
}

function refreshRMOutFormControls() {
    const dateInput = document.getElementById('rmOutDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const itemSelect = document.getElementById('rmOutSelect');
    const formulaSelect = document.getElementById('rmOutFormulaSelect');
    const editor = document.getElementById('rmFormulaIngredientsEditor');
    
    // Check if user is currently editing a formula (editor is visible)
    const isEditingFormula = editor && editor.style.display !== 'none';

    // 1. Refresh Material Select (always preserve selection)
    if (itemSelect) {
        const currentItem = itemSelect.value;
        itemSelect.innerHTML = '<option value="">-- Select Material --</option>';
        rmItems.sort((a,b) => a.name.localeCompare(b.name)).forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.innerText = `${i.name} (Stock: ${i.stock} ${i.unit})`;
            itemSelect.appendChild(opt);
        });
        if (currentItem) itemSelect.value = currentItem;
    }

    // 2. Refresh Formula Select (ONLY if not currently editing/using it)
    if (formulaSelect && !isEditingFormula) {
        const currentFormula = formulaSelect.value;
        formulaSelect.innerHTML = '<option value="">-- Select Production Formula --</option>';
        rmFormulas.sort((a,b) => a.name.localeCompare(b.name)).forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.innerText = f.name;
            formulaSelect.appendChild(opt);
        });
        if (currentFormula) formulaSelect.value = currentFormula;
    }
    
    refreshRMOutHistoryTable();
}

function previewFormulaUsage() {
    const id = document.getElementById('rmOutFormulaSelect').value;
    const preview = document.getElementById('formulaPreview');
    const editor = document.getElementById('rmFormulaIngredientsEditor');
    const list = document.getElementById('rmFormulaIngredientsList');

    if (!id) { 
        if (preview) preview.innerHTML = ''; 
        if (editor) editor.style.display = 'none';
        return; 
    }
    
    const items = rmFormulaItems.filter(fi => fi.formula_id == id);
    let text = '<strong>Standard Batch:</strong> ';
    
    if (list) {
        list.innerHTML = `
            <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr; gap: 8px; font-size: 0.75rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid var(--gray-100); padding-bottom: 5px;">
                <span>Material</span>
                <span style="text-align: right;">Qty (KG)</span>
                <span style="text-align: right;">Price</span>
                <span style="text-align: right;">Subtotal</span>
            </div>
        `;
    }
    
    let totalFormulaValue = 0;
    
    items.forEach((fi, idx) => {
        const item = rmItems.find(i => i.id == fi.rm_item_id);
        const name = item ? item.name : 'Unknown';
        text += `${name} (${fi.quantity})`;
        if (idx < items.length - 1) text += ' + ';
        
        // Add to editor
        if (list) {
            const priceVal = getRMItemCurrentPrice(item);
            const subtotal = fi.quantity * priceVal;
            totalFormulaValue += subtotal;

            const row = document.createElement('div');
            row.style.cssText = 'display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr; gap: 8px; align-items: center; background: white; padding: 5px 10px; border-radius: 6px; border: 1px solid var(--gray-200); margin-bottom: 2px;';
            row.innerHTML = `
                <span style="font-size: 0.85rem; font-weight: 500; color: var(--gray-700);">${name}</span>
                <input type="number" class="form-control rm-formula-custom-qty" 
                       data-item-id="${fi.rm_item_id}" 
                       value="${fi.quantity}" 
                       style="padding: 2px 6px; font-size: 0.85rem; height: 28px; text-align: right; border: 1px solid var(--gray-300);"
                       oninput="recalculateFormulaTotalValue()">
                <span style="font-size: 0.8rem; text-align: right; color: var(--gray-500);">${priceVal.toFixed(1)}</span>
                <span style="font-size: 0.85rem; font-weight: 700; text-align: right; color: var(--gray-700);">Rs. ${subtotal.toLocaleString()}</span>
            `;
            list.appendChild(row);
        }
    });

    if (list) {
        const totalRow = document.createElement('div');
        totalRow.id = 'formulaTotalValueRow';
        totalRow.style.cssText = 'display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 2px solid var(--gray-100);';
        totalRow.innerHTML = `
            <span style="font-size: 0.8rem; font-weight: 800; color: var(--gray-400); text-transform: uppercase;">Formula Total Value:</span>
            <span id="formulaTotalValueDisplay" style="font-size: 1.2rem; font-weight: 900; color: var(--success);">Rs. ${totalFormulaValue.toLocaleString()}</span>
        `;
        list.appendChild(totalRow);
    }

    if (preview) preview.innerHTML = text;
    if (editor) editor.style.display = 'block';
}

function getRMItemCurrentPrice(item) {
    if (!item) return 0;
    
    let basePrice = parseFloat(item.base_price) || 0;
    if (basePrice > 0) return basePrice;

    // Fallback to history average
    const history = rmTransactions.filter(t => t.type === 'IN' && t.rm_item_id == item.id && parseFloat(t.price) > 0);
    if (history.length > 0) {
        let totalQty = 0;
        let totalCost = 0;
        history.forEach(t => {
            const q = parseFloat(t.quantity) || 0;
            const p = parseFloat(t.price) || 0;
            totalQty += q;
            totalCost += (q * p);
        });
        return totalQty > 0 ? (totalCost / totalQty) : 0;
    }
    return 0;
}

function recalculateFormulaTotalValue() {
    const list = document.getElementById('rmFormulaIngredientsList');
    if (!list) return;
    
    const inputs = list.querySelectorAll('.rm-formula-custom-qty');
    let total = 0;
    inputs.forEach(input => {
        const itemId = input.dataset.itemId;
        const qty = parseFloat(input.value) || 0;
        const item = rmItems.find(i => i.id == itemId);
        const price = getRMItemCurrentPrice(item);
        
        // Update subtotal display in that row
        const row = input.parentElement;
        const subtotalEl = row.children[3];
        if (subtotalEl) {
            subtotalEl.innerText = 'Rs. ' + (qty * price).toLocaleString();
        }
        
        total += qty * price;
    });
    
    const display = document.getElementById('formulaTotalValueDisplay');
    if (display) display.innerText = 'Rs. ' + total.toLocaleString();
}

function updateRMOutMetrics() {
    const lastDateEl = document.getElementById('rmLastFormulaDate');
    const weightEl = document.getElementById('rmDailyFormulaWeight');
    const valueEl = document.getElementById('rmDailyFormulaValue');
    if (!lastDateEl || !weightEl) return;

    // 1. Find all formula transactions
    const formulaTransactions = rmTransactions.filter(t => t.type === 'OUT' && t.notes && t.notes.includes('[Formula:'));
    
    if (formulaTransactions.length === 0) {
        lastDateEl.innerText = '--';
        weightEl.innerText = '0.0 KG';
        if (valueEl) valueEl.innerText = 'Rs. 0';
        return;
    }

    // 2. Find the LATEST date in history
    let maxDateVal = 0;
    let latestT = null;
    formulaTransactions.forEach(t => {
        const d = new Date(t.date).getTime();
        if (d > maxDateVal) {
            maxDateVal = d;
            latestT = t;
        }
    });

    const latestDateStr = new Date(latestT.date).toDateString();
    let totalKg = 0;
    let totalValue = 0;

    // 3. Sum up all formulas for THAT specific latest date
    formulaTransactions.forEach(t => {
        if (new Date(t.date).toDateString() === latestDateStr) {
            const item = rmItems.find(i => i.id == t.rm_item_id);
            const qty = (parseFloat(t.quantity) || 0);
            let price = (parseFloat(t.price) || 0);
            
            if (price <= 0 && item) {
                price = getRMItemCurrentPrice(item);
            }

            totalKg += qty;
            totalValue += qty * price;
        }
    });

    // 4. Display the date from history
    const dObj = new Date(latestT.date);
    const day = String(dObj.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    lastDateEl.innerText = formatDate(latestT.date, false);
    
    weightEl.innerText = totalKg.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' KG';
    if (valueEl) valueEl.innerText = 'Rs. ' + totalValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
}

function refreshRMOutHistoryTable() {
    updateRMOutMetrics(); // Update the new meter
    const tbody = document.getElementById('rmOutTable');
    if (!tbody) return;
    
    const consumption = rmTransactions.filter(t => t.type === 'OUT').sort((a,b) => b.id - a.id).slice(0, 50);
    tbody.innerHTML = '';
    
    consumption.forEach(t => {
        const item = rmItems.find(i => i.id == t.rm_item_id);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(t.date)}</td>
            <td style="font-weight: 600;">${item ? item.name : 'Unknown'}</td>
            <td><span class="badge" style="background: #fff5f5; color: var(--error); border: 1px solid #feb2b2;">CONSUMPTION</span></td>
            <td style="font-weight: bold;">${t.quantity} ${item ? item.unit : ''}</td>
            <td style="color: var(--gray-500); font-style: italic; font-size: 0.85rem;">${t.notes || ''}</td>
            <td style="text-align: center; display: flex; gap: 4px; justify-content: center;">
                <button class="btn btn-sm" onclick="revertRMTransaction(${t.id})" style="background:#0ea5e9; color:white; padding: 3px 6px; font-size: 0.7rem;" title="Remove & Revert RM Stock">🔄 Remove</button>
                <button class="btn btn-icon text-error" onclick="deleteRMTransaction(${t.id})" title="Delete record only">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteRMTransaction(id) {
    if (!confirm('Are you sure you want to delete this specific history record?')) return;
    const response = await fetch('api/sync.php?action=delete_rm_transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    });
    if ((await response.json()).status === 'success') {
        initApp();
    }
}

async function deleteAllRMOutHistory() {
    if (!confirm('🛑 WARNING: This will permanently delete ALL Consumption (OUT) history. Current stock levels will NOT be changed. Do you want to proceed?')) return;
    
    const response = await fetch('api/sync.php?action=delete_all_rm_transactions_out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    
    if ((await response.json()).status === 'success') {
        initApp();
    }
}

function exportRMOutToExcel() {
    const consumption = rmTransactions.filter(t => t.type === 'OUT').sort((a,b) => b.id - a.id);
    if (consumption.length === 0) { alert('No consumption history to export.'); return; }

    let csv = 'Date,Material,Type,Quantity,Unit,Notes\n';
    consumption.forEach(t => {
        const item = rmItems.find(i => i.id == t.rm_item_id);
        const date = formatDate(t.date);
        const name = item ? item.name : 'Unknown';
        const unit = item ? item.unit : '';
        const notes = (t.notes || '').replace(/,/g, ' '); // simple sanitization
        csv += `${date},${name},CONSUMPTION,${t.quantity},${unit},${notes}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `RM_Consumption_History_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Process RM Transaction
function refreshRMConsumptionReport() {
    // 1. Calculate Latest FG Production (Inbound) - Most recent active day
    let lastFGDate = null;
    transactions.forEach(t => {
        if (t.type === 'IN') {
            const d = new Date(t.date);
            if (!isNaN(d.getTime()) && (!lastFGDate || d > lastFGDate)) lastFGDate = d;
        }
    });

    let fgTotalKg = 0;
    if (lastFGDate) {
        const lastFGDateStr = lastFGDate.toDateString();
        transactions.forEach(t => {
            if (t.type === 'IN' && new Date(t.date).toDateString() === lastFGDateStr) {
                fgTotalKg += (parseFloat(t.quantity) || 0) * (parseFloat(t.itemWeight) || 0);
            }
        });
    }

    // 2. Calculate Latest RM Formula Issuance (Outbound) - Most recent active day
    let lastRMDate = null;
    rmTransactions.forEach(t => {
        if (t.type === 'OUT' && t.notes && t.notes.includes('[Formula:')) {
            const d = new Date(t.date);
            if (!isNaN(d.getTime()) && (!lastRMDate || d > lastRMDate)) lastRMDate = d;
        }
    });

    let rmTotalKg = 0;
    let rmTotalValue = 0;
    if (lastRMDate) {
        const lastRMDateStr = lastRMDate.toDateString();
        rmTransactions.forEach(t => {
            if (t.type === 'OUT' && t.notes && t.notes.includes('[Formula:') && new Date(t.date).toDateString() === lastRMDateStr) {
                const item = rmItems.find(i => i.id == t.rm_item_id);
                const qty = (parseFloat(t.quantity) || 0);
                let price = (parseFloat(t.price) || 0);

                // Fallback for old transactions that had 0 price
                if (price <= 0 && item) {
                    price = getRMItemCurrentPrice(item);
                }

                rmTotalKg += qty;
                rmTotalValue += qty * price;
            }
        });
    }

    // 3. Update UI Elements
    const fgWeightEl = document.getElementById('wipFGWeight');
    const rmWeightEl = document.getElementById('wipRMWeight');
    const rmValueEl = document.getElementById('wipRMValue');
    const gapEl = document.getElementById('wipGapTotal');

    if (fgWeightEl) {
        fgWeightEl.innerText = fgTotalKg.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' KG';
    }

    if (rmWeightEl) {
        rmWeightEl.innerText = rmTotalKg.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' KG';
    }
    
    if (rmValueEl) {
        rmValueEl.innerText = 'Rs. ' + rmTotalValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
    }

    if (gapEl) {
        const gap = rmTotalKg - fgTotalKg;
        gapEl.innerText = gap.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' KG';
        
        // Fix: Use bold colors for the white background cards
        if (gap < -0.01) {
            gapEl.style.color = '#dc2626'; // Strong Red for negative/discrepancy
        } else if (gap > 0.01) {
            gapEl.style.color = '#059669'; // Strong Green for positive/in-process
        } else {
            gapEl.style.color = 'var(--gray-800)'; // Neutral
        }
    }

    refreshRMConsumptionHistory();
}

async function saveRMConsumptionEntry() {
    await autoSaveRMConsumption();
}

async function autoSaveRMConsumption() {
    // 1. Calculate FG Total (Same logic as refreshRMConsumptionReport)
    let lastFGDate = null;
    transactions.forEach(t => {
        if (t.type === 'IN') {
            const d = new Date(t.date);
            if (!isNaN(d.getTime()) && (!lastFGDate || d > lastFGDate)) lastFGDate = d;
        }
    });

    let fgTotalKg = 0;
    if (lastFGDate) {
        const lastFGDateStr = lastFGDate.toDateString();
        transactions.forEach(t => {
            if (t.type === 'IN' && new Date(t.date).toDateString() === lastFGDateStr) {
                fgTotalKg += (parseFloat(t.quantity) || 0) * (parseFloat(t.itemWeight) || 0);
            }
        });
    }

    // 2. Calculate RM Totals (Same logic as refreshRMConsumptionReport)
    let lastRMDate = null;
    rmTransactions.forEach(t => {
        if (t.type === 'OUT' && t.notes && t.notes.includes('[Formula:')) {
            const d = new Date(t.date);
            if (!isNaN(d.getTime()) && (!lastRMDate || d > lastRMDate)) lastRMDate = d;
        }
    });

    let rmTotalKg = 0;
    let rmTotalValue = 0;
    if (lastRMDate) {
        const lastRMDateStr = lastRMDate.toDateString();
        rmTransactions.forEach(t => {
            if (t.type === 'OUT' && t.notes && t.notes.includes('[Formula:') && new Date(t.date).toDateString() === lastRMDateStr) {
                const item = rmItems.find(i => i.id == t.rm_item_id);
                const qty = (parseFloat(t.quantity) || 0);
                let price = (parseFloat(t.price) || 0);

                if (price <= 0 && item) {
                    price = getRMItemCurrentPrice(item);
                }

                rmTotalKg += qty;
                rmTotalValue += qty * price;
            }
        });
    }
    
    // Don't auto-save if both are zero
    if (fgTotalKg === 0 && rmTotalKg === 0) return;

    const gapVal = rmTotalKg - fgTotalKg;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const log = {
        date: now,
        fg_weight: fgTotalKg,
        rm_weight: rmTotalKg,
        rm_value: rmTotalValue,
        in_process: 0,
        gap: gapVal,
        notes: '[Saved]'
    };

    try {
        const response = await fetch('api/sync.php?action=save_rm_consumption_log', {
            method: 'POST',
            body: JSON.stringify({ log })
        });
        const result = await response.json();
        if (result.status === 'success') {
            log.id = result.id;
            rmConsumptionLogs.unshift(log);
            populateRMHistoryYearFilter(); 
            refreshRMConsumptionHistory();
            alert('Daily entry saved successfully!');
        }
    } catch (e) { console.error('Failed to save log:', e); }
}

function refreshRMConsumptionHistory() {
    const tbody = document.getElementById('rmConsumptionHistoryTable');
    const tfoot = document.getElementById('rmConsumptionHistoryFooter');
    if (!tbody) return;

    const monthF = document.getElementById('rmHistoryMonthFilter')?.value;
    const yearF = document.getElementById('rmHistoryYearFilter')?.value;

    let filteredLogs = rmConsumptionLogs.filter(l => {
        const d = new Date(l.date);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const matchesMonth = !monthF || monthF == m;
        const matchesYear = !yearF || yearF == y;
        return matchesMonth && matchesYear;
    });

    let html = '';
    let totalFG = 0;
    let totalRM = 0;
    let totalValue = 0;
    let totalOtherExpenses = 0;
    let totalGrandTotal = 0;
    let totalInProcess = 0;
    let totalGap = 0;

    filteredLogs.forEach(l => {
        const fg = parseFloat(l.fg_weight) || 0;
        const rm = parseFloat(l.rm_weight) || 0;
        const val = parseFloat(l.rm_value) || 0;
        const other = parseFloat(l.other_expenses) || 0;
        const grandTotal = val + other;
        const inp = parseFloat(l.in_process) || 0;
        const gap = rm - fg - inp;
        
        totalFG += fg;
        totalRM += rm;
        totalValue += val;
        totalOtherExpenses += other;
        totalGrandTotal += grandTotal;
        totalInProcess += inp;
        totalGap += gap;

        html += `
            <tr data-id="${l.id}">
                <td style="padding: 0.8rem; font-size: 0.9rem; line-height: 1.2;">${formatDate(l.date)}</td>
                <td style="padding: 0.8rem; text-align: left;">${fg.toLocaleString()} KG</td>
                <td style="padding: 0.8rem; text-align: left;">${rm.toLocaleString()} KG</td>
                <td style="padding: 0.8rem; text-align: left; color: var(--gray-600); font-weight: 700;">Rs. ${val.toLocaleString()}</td>
                <td style="padding: 0.6rem; text-align: left;">
                    <input type="number" step="1" value="${other}" 
                        onchange="updateRMConsumptionOtherExpenses(${l.id}, this.value)"
                        style="width: 75px; padding: 0.3rem; text-align: left; border: 1px solid var(--gray-200); border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
                </td>
                <td style="padding: 0.8rem; text-align: left; color: var(--success); font-weight: 800; font-size: 0.95rem;">
                    Rs. ${grandTotal.toLocaleString()}
                </td>
                <td style="padding: 0.6rem; text-align: left;">
                    <input type="number" step="0.1" value="${inp}" 
                        onchange="updateRMConsumptionInProcess(${l.id}, this.value)"
                        style="width: 75px; padding: 0.3rem; text-align: left; border: 1px solid var(--gray-200); border-radius: 6px; font-weight: 600; font-size: 0.85rem;">
                </td>
                <td style="padding: 0.8rem; text-align: left; color: ${gap < 0 ? '#dc2626' : '#059669'}; font-weight: bold; font-size: 0.9rem;">
                    ${gap.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} KG
                </td>
                <td style="padding: 0.8rem; text-align: center;">
                    <button class="btn btn-sm btn-danger" onclick="deleteRMConsumptionEntry(${l.id})" style="padding: 4px 8px;">🗑️</button>
                </td>
            </tr>`;
    });

    if (filteredLogs.length === 0) {
        html = `<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--gray-400);">No history records found for selected filters.</td></tr>`;
    }

    tbody.innerHTML = html;

    if (tfoot) {
        tfoot.innerHTML = `
            <tr>
                <td style="padding: 0.8rem;">SUB TOTAL (FILTERED)</td>
                <td style="padding: 0.8rem; text-align: left;">${totalFG.toLocaleString()} KG</td>
                <td style="padding: 0.8rem; text-align: left;">${totalRM.toLocaleString()} KG</td>
                <td style="padding: 0.8rem; text-align: left; color: var(--gray-600);">Rs. ${totalValue.toLocaleString()}</td>
                <td style="padding: 0.8rem; text-align: left; color: var(--gray-600);">Rs. ${totalOtherExpenses.toLocaleString()}</td>
                <td style="padding: 0.8rem; text-align: left; color: var(--success);">Rs. ${totalGrandTotal.toLocaleString()}</td>
                <td style="padding: 0.8rem; text-align: left;">${totalInProcess.toLocaleString()} KG</td>
                <td style="padding: 0.8rem; text-align: left; color: ${totalGap < 0 ? '#dc2626' : '#059669'};">
                    ${totalGap.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} KG
                </td>
                <td></td>
            </tr>`;
    }

    // Update the Total WIP Summary Card & Breakdown whenever history is refreshed
    updateTotalWIPSummary();
}


async function updateRMConsumptionInProcess(id, val) {
    const value = parseFloat(val) || 0;
    try {
        const response = await fetch('api/sync.php?action=save_rm_consumption_in_process', {
            method: 'POST',
            body: JSON.stringify({ id, in_process: value })
        });
        const result = await response.json();
        if (result.status === 'success') {
            // Update local data
            const log = rmConsumptionLogs.find(l => l.id == id);
            if (log) {
                log.in_process = value;
                log.gap = result.gap;
            }
            refreshRMConsumptionHistory();
        }
    } catch (e) {
        console.error('Failed to update in-process value:', e);
        alert('Failed to save value. Check connection.');
    }
}

async function updateRMConsumptionOtherExpenses(id, val) {
    const value = parseFloat(val) || 0;
    try {
        const response = await fetch('api/sync.php?action=save_rm_consumption_other_expenses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, other_expenses: value })
        });
        const result = await response.json();
        if (result.status === 'success') {
            // Update local data
            const log = rmConsumptionLogs.find(l => l.id == id);
            if (log) {
                log.other_expenses = value;
            }
            refreshRMConsumptionHistory();
        }
    } catch (e) {
        console.error('Failed to update other expenses:', e);
        alert('Failed to save value. Check connection.');
    }
}

function populateRMHistoryYearFilter() {
    const yearSelect = document.getElementById('rmHistoryYearFilter');
    const monthSelect = document.getElementById('rmHistoryMonthFilter');
    if (!yearSelect) return;
    
    // Default to current month/year on first load
    const now = new Date();
    let wasEmpty = false;
    if (monthSelect && !monthSelect.value) {
        monthSelect.value = now.getMonth() + 1;
        wasEmpty = true;
    }

    const currentVal = yearSelect.value;
    const years = [...new Set(rmConsumptionLogs.map(l => new Date(l.date).getFullYear()))].sort((a,b) => b - a);
    
    let html = '<option value="">All Years</option>';
    years.forEach(y => {
        html += `<option value="${y}">${y}</option>`;
    });
    yearSelect.innerHTML = html;

    if (currentVal) {
        yearSelect.value = currentVal;
    } else if (years.includes(now.getFullYear())) {
        yearSelect.value = now.getFullYear();
        wasEmpty = true;
    }

    // If we defaulted from empty to current month/year, refresh the table
    if (wasEmpty) refreshRMConsumptionHistory();
}

async function deleteRMConsumptionEntry(id) {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
        const response = await fetch('api/sync.php?action=delete_rm_consumption_log', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        const result = await response.json();
        if (result.status === 'success') {
            rmConsumptionLogs = rmConsumptionLogs.filter(l => l.id != id);
            refreshRMConsumptionHistory();
        }
    } catch (e) { console.error('Failed to delete log:', e); }
}

async function clearRMConsumptionHistory() {
    if (!confirm('CAUTION: This will delete ALL records from the history list. Proceed?')) return;
    try {
        const response = await fetch('api/sync.php?action=clear_rm_consumption_history', {
            method: 'POST'
        });
        const result = await response.json();
        if (result.status === 'success') {
            rmConsumptionLogs = [];
            refreshRMConsumptionHistory();
        }
    } catch (e) { console.error('Failed to clear history:', e); }
}

async function saveRMTransaction(type) {
    const saveBtn = type === 'IN' ? document.getElementById('rmInSaveBtn') : document.getElementById('rmOutSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving...';
    }

    try {
        const mode = type === 'OUT' ? (document.querySelector('input[name="rmOutMode"]:checked')?.value || 'SINGLE') : 'SINGLE';
        const notes = document.getElementById(type === 'IN' ? 'rmInNotes' : 'rmOutNotes').value.trim();
        const customDateInput = document.getElementById(type === 'IN' ? 'rmInDate' : 'rmOutDate');
        const customDateValue = customDateInput ? customDateInput.value : null;

        const qtyInput = document.getElementById(type === 'IN' ? 'rmInQty' : 'rmOutQty');
        const priceInput = document.getElementById('rmInPrice');
        const multiplier = parseFloat(qtyInput.value);
        const unitPriceUser = priceInput ? (parseFloat(priceInput.value) || 0) : 0;

        if (isNaN(multiplier) || multiplier <= 0) { 
            alert('Enter a valid quantity'); 
            return; 
        }

        let actualKg = multiplier;
        if (mode === 'SINGLE') {
            const itemId = type === 'IN' ? document.getElementById('rmInSelect').value : document.getElementById('rmOutSelect').value;
            const unitSelectId = type === 'IN' ? 'rmInUnitSelect' : 'rmOutUnitSelect';
            const selectedUnit = document.getElementById(unitSelectId).value;
            
            if (!itemId) { alert('Select a material'); return; }
            const item = rmItems.find(i => i.id == itemId);
            
            if (selectedUnit === 'Bags') {
                const kgPerBag = parseFloat(item.kgPerBag) || 0;
                if (kgPerBag <= 0) { alert('Please set "KG per Bag" for this item in Inventory before using Bags.'); return; }
                actualKg = multiplier * kgPerBag;
            } else if (selectedUnit === 'Grams') {
                actualKg = multiplier / 1000;
            }
            
            let pricePerKg = 0;
            if (type === 'IN' && actualKg > 0) {
                pricePerKg = (unitPriceUser * multiplier) / actualKg;
            } else if (type === 'OUT') {
                const item = rmItems.find(i => i.id == itemId);
                pricePerKg = getRMItemCurrentPrice(item);
            }
            
            await recordSingleRMTransaction(itemId, actualKg, type, notes, pricePerKg, null, customDateValue);
        } else {
            // Formula Mode
            const formulaId = document.getElementById('rmOutFormulaSelect').value;
            if (!formulaId) { alert('Select a formula'); return; }
            
            const formula = rmFormulas.find(f => f.id == formulaId);
            
            // Collect custom quantities from the editor
            const customRows = document.querySelectorAll('.rm-formula-custom-qty');
            const customItems = [];
            customRows.forEach(input => {
                const itemId = input.getAttribute('data-item-id');
                const qty = parseFloat(input.value);
                if (itemId && !isNaN(qty) && qty > 0) {
                    customItems.push({ itemId, qty });
                }
            });

            if (customItems.length === 0) { alert('No valid items to consume'); return; }
            
            if (!confirm(`Using "${formula.name}" x ${multiplier}. Total of ${customItems.length} items will be consumed with your adjusted quantities. Proceed?`)) {
                return;
            }

            for (const item of customItems) {
                const totalQty = item.qty * multiplier;
                const rmItem = rmItems.find(i => i.id == item.itemId);
                const priceVal = getRMItemCurrentPrice(rmItem);
                await recordSingleRMTransaction(item.itemId, totalQty, 'OUT', `[Formula: ${formula.name}] ${notes}`, priceVal, formula.main_id, customDateValue);
            }
        }

        await initApp();
        
        // Reset Form Fields
        if (type === 'IN') {
            if (document.getElementById('rmInQty')) document.getElementById('rmInQty').value = '';
            if (document.getElementById('rmInSelect')) document.getElementById('rmInSelect').value = '';
            if (document.getElementById('rmInPrice')) document.getElementById('rmInPrice').value = '';
            if (document.getElementById('rmInNotes')) document.getElementById('rmInNotes').value = '';
        } else {
            if (document.getElementById('rmOutQty')) document.getElementById('rmOutQty').value = '1';
            if (document.getElementById('rmOutSelect')) document.getElementById('rmOutSelect').value = '';
            if (document.getElementById('rmOutFormulaSelect')) document.getElementById('rmOutFormulaSelect').value = '';
            if (document.getElementById('rmOutNotes')) document.getElementById('rmOutNotes').value = '';
            
            // Hide formula editor
            const editor = document.getElementById('rmFormulaIngredientsEditor');
            if (editor) editor.style.display = 'none';
            const preview = document.getElementById('formulaPreview');
            if (preview) preview.innerHTML = '';
        }
        
        // Clear hints
        if (document.getElementById('rmInConversionHint')) document.getElementById('rmInConversionHint').innerText = '';
        if (document.getElementById('rmOutConversionHint')) document.getElementById('rmOutConversionHint').innerText = '';

        // Auto-save consumption snapshot after RM transaction
        await autoSaveRMConsumption();
        
        // Refresh UI components directly without reloading everything
        refreshRMInHistoryTable();
        refreshRMOutHistoryTable();
        refreshDashboard();
        refreshRMInventoryBalance();
        if (type === 'IN') refreshRMInFormControls();
        
        alert('ad sucsessfuly');
    } catch (err) {
        console.error('saveRMTransaction Error:', err);
        alert('❌ Error saving RM transaction.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save';
        }
    }
}

/**
 * Calculates and updates the Grand Total WIP card and the Monthly Breakdown panel.
 */
function updateTotalWIPSummary() {
    const totalEl = document.getElementById('grandTotalWIP');
    const listEl = document.getElementById('wipMonthlyList');
    if (!totalEl || !listEl) return;

    let grandTotal = 0;
    const monthlyData = {}; // Key: "Month Year", Value: Sum of Gap

    // Process all logs (not just filtered ones)
    rmConsumptionLogs.forEach(l => {
        const fg = parseFloat(l.fg_weight) || 0;
        const rm = parseFloat(l.rm_weight) || 0;
        const inp = parseFloat(l.in_process) || 0;
        const gap = rm - fg - inp;
        grandTotal += gap;

        const d = new Date(l.date);
        const monthYear = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        if (!monthlyData[monthYear]) monthlyData[monthYear] = 0;
        monthlyData[monthYear] += gap;
    });

    // Update Grand Total Card
    totalEl.innerText = grandTotal.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' KG';
    totalEl.style.color = grandTotal < 0 ? '#dc2626' : (grandTotal > 0 ? '#059669' : 'var(--gray-800)');

    // Update Monthly Breakdown List
    let listHtml = '';
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => new Date(b) - new Date(a)); // Newest first

    sortedMonths.forEach(month => {
        const val = monthlyData[month];
        listHtml += `
            <div style="background: white; padding: 1rem; border-radius: 10px; border: 1px solid var(--gray-100); box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="font-size: 0.75rem; color: var(--gray-400); font-weight: 700; text-transform: uppercase; margin-bottom: 0.3rem;">${month}</div>
                <div style="font-size: 1.05rem; font-weight: 800; color: ${val < 0 ? '#dc2626' : (val > 0 ? '#059669' : 'var(--gray-800)')};">
                    ${val.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} KG
                </div>
            </div>
        `;
    });

    if (sortedMonths.length === 0) {
        listHtml = '<div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: var(--gray-400);">No monthly data available.</div>';
    }

    listEl.innerHTML = listHtml;
}

/**
 * Toggles the visibility of the monthly breakdown panel.
 */
function toggleWIPBreakdown() {
    const panel = document.getElementById('wipBreakdownPanel');
    const arrow = document.getElementById('wipCardArrow');
    const card = document.getElementById('totalWIPCard');
    
    if (!panel) return;

    if (panel.style.display === 'none' || !panel.style.display) {
        panel.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        if (card) {
            card.style.borderColor = 'var(--sky-500)';
            card.style.background = 'var(--sky-50)';
        }
    } else {
        panel.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        if (card) {
            card.style.borderColor = 'var(--sky-200)';
            card.style.background = 'white';
        }
    }
}


/**
 * Real-time conversion hint logic
 */
function updateRMConversionHint(type) {
    const qtyInput = document.getElementById(`rm${type === 'IN' ? 'In' : 'Out'}Qty`);
    const selectId = `rm${type === 'IN' ? 'In' : 'Out'}Select`;
    const unitSelectId = `rm${type === 'IN' ? 'In' : 'Out'}UnitSelect`;
    const hintId = `rm${type === 'IN' ? 'In' : 'Out'}ConversionHint`;
    
    const qty = parseFloat(qtyInput.value);
    const itemId = document.getElementById(selectId).value;
    const unitSelect = document.getElementById(unitSelectId);
    const unit = unitSelect ? unitSelect.value : 'KG';
    const hintEl = document.getElementById(hintId);
    
    if (!hintEl) return;
    if (isNaN(qty) || !itemId || unit === 'KG' || unit === 'Multiplier') { hintEl.innerText = ''; return; }
    
    const item = rmItems.find(i => i.id == itemId);
    if (!item) { hintEl.innerText = ''; return; }

    if (unit === 'Bags') {
        const kgPerBag = parseFloat(item.kgPerBag) || 0;
        if (kgPerBag > 0) {
            hintEl.innerText = `(= ${(qty * kgPerBag).toFixed(2)} KG)`;
        } else {
            hintEl.innerText = '(Set KG/Bag in Inventory first)';
        }
    } else if (unit === 'Grams') {
        hintEl.innerText = `(= ${(qty / 1000).toFixed(3)} KG)`;
    }
}

/**
 * Enhanced RM Out Mode Toggle
 */
function setRMOutMode(mode) {
    document.querySelectorAll('input[name="rmOutMode"]').forEach(radio => {
        if (radio.value === mode) radio.checked = true;
    });
    
    // UI toggles
    if (document.getElementById('rmOutSingleGroup')) document.getElementById('rmOutSingleGroup').style.display = (mode === 'SINGLE') ? 'block' : 'none';
    if (document.getElementById('rmOutFormulaGroup')) document.getElementById('rmOutFormulaGroup').style.display = (mode === 'FORMULA') ? 'block' : 'none';
    if (document.getElementById('rmFormulaIngredientsEditor')) document.getElementById('rmFormulaIngredientsEditor').style.display = (mode === 'FORMULA') ? 'block' : 'none';
    if (document.getElementById('formulaPreview')) document.getElementById('formulaPreview').style.display = (mode === 'FORMULA') ? 'block' : 'none';
    
    document.querySelectorAll('.mode-toggle-btn').forEach(btn => btn.classList.remove('active'));
    if (document.getElementById(`modeBtn_${mode}`)) document.getElementById(`modeBtn_${mode}`).classList.add('active');

    // Unit toggle
    const unitSelect = document.getElementById('rmOutUnitSelect');
    if (unitSelect) {
        const batchesOpt = [...unitSelect.options].find(o => o.value === 'Multiplier');
        if (mode === 'FORMULA') {
            unitSelect.value = 'Multiplier';
            if (batchesOpt) batchesOpt.style.display = 'block';
            [...unitSelect.options].forEach(o => { if(o.value !== 'Multiplier') o.style.display = 'none'; });
            if (document.getElementById('rmOutQtyLabel')) document.getElementById('rmOutQtyLabel').innerText = 'Number of Batches';
        } else {
            unitSelect.value = 'KG';
            if (batchesOpt) batchesOpt.style.display = 'none';
            [...unitSelect.options].forEach(o => { if(o.value !== 'Multiplier') o.style.display = 'block'; });
            if (document.getElementById('rmOutQtyLabel')) document.getElementById('rmOutQtyLabel').innerText = 'Quantity';
        }
    }
    updateRMConversionHint('OUT');
}

// ==================== RM IN LOGIC ====================

function refreshRMInFormControls() {
    const dateInput = document.getElementById('rmInDate');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const itemSelect = document.getElementById('rmInSelect');
    if (itemSelect) {
        itemSelect.innerHTML = '<option value="">-- Select Material --</option>';
        rmItems.sort((a,b) => a.name.localeCompare(b.name)).forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id;
            opt.innerText = `${i.name} (Current: ${i.stock} ${i.unit})`;
            itemSelect.appendChild(opt);
        });
    }
    refreshRMInHistoryTable();
}

function refreshRMInHistoryTable() {
    const tbody = document.getElementById('rmInTable');
    if (!tbody) return;
    
    const purchases = rmTransactions.filter(t => t.type === 'IN').sort((a,b) => b.id - a.id).slice(0, 50);
    tbody.innerHTML = '';
    
    purchases.forEach(t => {
        const item = rmItems.find(i => i.id == t.rm_item_id);
        const qty = parseFloat(t.quantity) || 0;
        const pricePerKg = parseFloat(t.price) || 0;
        const totalAmount = qty * pricePerKg;
        
        // Try to estimate original unit price for display
        // Since we only store pricePerKg and qtyInKg, we can't be sure of original unit
        // But for display, we'll just show total and internal unit price
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${t.date ? t.date.split(' ')[0] : '---'}</td>
            <td style="font-weight: 600;">${item ? item.name : 'Unknown'}</td>
            <td style="font-weight: bold; color: var(--success); font-size: 1.1rem;">+${qty.toLocaleString()} ${item ? 'KG' : ''}</td>
            <td style="text-align: right;">${pricePerKg.toLocaleString(undefined, {minimumFractionDigits: 1})} / KG</td>
            <td style="text-align: right; font-weight: bold; color: var(--sky-600);">Rs. ${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 1})}</td>
            <td style="color: var(--gray-500); font-style: italic; font-size: 0.85rem;">${t.notes || ''}</td>
            <td style="text-align: center; display: flex; gap: 4px; justify-content: center;">
                <button class="btn btn-sm" onclick="revertRMTransaction(${t.id})" style="background:#0ea5e9; color:white; padding: 3px 6px; font-size: 0.7rem;" title="Remove & Revert RM Stock">🔄 Remove</button>
                <button class="btn btn-icon text-error" onclick="deleteRMTransaction(${t.id})" title="Delete record only">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteAllRMInHistory() {
    if (!confirm('🛑 WARNING: This will permanently delete ALL Purchase (IN) history. Stock levels will NOT be changed. Continue?')) return;
    
    const response = await fetch('api/sync.php?action=delete_all_rm_transactions_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    
    if ((await response.json()).status === 'success') {
        initApp();
    }
}

async function recordSingleRMTransaction(itemId, qty, type, notes, price = 0, brandId = null, customDate = null) {
    // Generate a consistent Local Time string (YYYY-MM-DD HH:mm:ss)
    const getLocalDBDate = (dateObj) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
    };
    
    const now = customDate ? (customDate + " " + new Date().toLocaleTimeString('en-GB')) : getLocalDBDate(new Date());
    const response = await fetch('api/sync.php?action=save_rm_transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: { rm_item_id: itemId, quantity: qty, price, type, notes, date: now, brand_id: brandId } })
    });
    const result = await response.json();
    if (result.status === 'success') {
        // Update local state for "Direct Save" experience
        const item = rmItems.find(i => i.id == itemId);
        if (item) {
            item.stock = type === 'IN' ? (parseFloat(item.stock) + qty) : (parseFloat(item.stock) - qty);
        }
        rmTransactions.unshift({
            id: result.id,
            rm_item_id: itemId,
            quantity: qty,
            price: price,
            type: type,
            notes: notes,
            date: now,
            brand_id: brandId
        });
    }
    return result;
}

function exportRMInToExcel() {
    const purchases = rmTransactions.filter(t => t.type === 'IN').sort((a,b) => b.id - a.id);
    if (purchases.length === 0) { alert('No purchase history to export.'); return; }

    let csv = 'Date,Material,Type,QuantityReceived,Unit,Notes\n';
    purchases.forEach(t => {
        const item = rmItems.find(i => i.id == t.rm_item_id);
        const date = t.date ? t.date.split(' ')[0] : '---';
        const name = item ? item.name : 'Unknown';
        const unit = item ? item.unit : '';
        const notes = (t.notes || '').replace(/,/g, ' ');
        csv += `${date},${name},STOCKED,${t.quantity},${unit},${notes}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `RM_Purchase_History_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function refreshRMInventoryBalance() {
    const tbody = document.getElementById('rmBalanceTable');
    if (!tbody) return;

    // Populate Filters if empty (Initial load)
    const mainFilter = document.getElementById('rmBalanceMainFilter');
    const subFilter = document.getElementById('rmBalanceSubFilter');
    const searchVal = document.getElementById('rmBalanceSearch') ? document.getElementById('rmBalanceSearch').value.toLowerCase() : '';

    if (mainFilter && mainFilter.options.length === 0) {
        mainFilter.innerHTML = '<option value="">All Brands</option>';
        rmMainCategories.sort((a,b) => a.name.localeCompare(b.name)).forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.innerText = m.name;
            mainFilter.appendChild(opt);
        });
    }

    const selectedMainId = mainFilter ? mainFilter.value : '';
    
    // Dependent Sub Filter
    if (subFilter && (subFilter.dataset.lastMainId !== selectedMainId || subFilter.options.length === 0)) {
        const currentSelectedSub = subFilter.value;
        subFilter.innerHTML = '<option value="">All Categories</option>';
        const filteredSubs = rmSubCategories.filter(s => !selectedMainId || s.mainId == selectedMainId);
        filteredSubs.sort((a,b) => a.name.localeCompare(b.name)).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.innerText = s.name;
            subFilter.appendChild(opt);
        });
        subFilter.dataset.lastMainId = selectedMainId;
        // Try to restore selection if it still exists in the filtered list
        if (currentSelectedSub) subFilter.value = currentSelectedSub;
    }
    
    const selectedSubId = subFilter ? subFilter.value : '';

    if (!rmItems || rmItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:2rem; color:var(--gray-500);">No raw materials found.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    
    // Advanced Filtering Logic
    let filteredItems = rmItems.filter(item => {
        const matchesSearch = !searchVal || item.name.toLowerCase().includes(searchVal) || item.code.toLowerCase().includes(searchVal);
        
        let matchesCategory = true;
        if (selectedSubId) {
            matchesCategory = item.subId == selectedSubId;
        } else if (selectedMainId) {
            const validSubIds = rmSubCategories.filter(s => s.mainId == selectedMainId).map(s => s.id);
            matchesCategory = validSubIds.includes(Number(item.subId));
        }

        return matchesSearch && matchesCategory;
    });

    const sortedItems = [...filteredItems].sort((a, b) => a.name.localeCompare(b.name));

    if (sortedItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--gray-500);">No items match your filters.</td></tr>';
        return;
    }

    sortedItems.forEach(item => {
        const currentStock = parseFloat(item.stock) || 0;
        const kgPerBag = parseFloat(item.kgPerBag) || 0;
        const bags = kgPerBag > 0 ? (currentStock / kgPerBag).toFixed(1) : '---';

        // Calculate Price Metrics from history
        const history = rmTransactions.filter(t => t.type === 'IN' && t.rm_item_id == item.id && parseFloat(t.price) > 0);
        
        let basePrice = parseFloat(item.base_price) || 0;
        let avgPrice = basePrice;
        let maxPrice = basePrice;
        let totalValue = 0;

        if (history.length > 0) {
            let totalQty = 0;
            let totalCost = 0;
            
            // If we have a base price, we treat it as the price for the current stock minus new purchases? 
            // That's complex. Let's simplify: 
            // If base_price is set, it overrides history for valuation. 
            // This is what users typically want when "balancing" records.
            
            history.forEach(t => {
                const q = parseFloat(t.quantity) || 0;
                const p = parseFloat(t.price) || 0;
                totalQty += q;
                totalCost += (q * p);
                if (p > maxPrice) maxPrice = p;
            });

            if (basePrice > 0) {
                avgPrice = basePrice; // Manual override persists
            } else if (totalQty > 0) {
                avgPrice = totalCost / totalQty;
            }
        }
        
        totalValue = currentStock * avgPrice;

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--gray-100)';
        row.innerHTML = `
            <td style="padding: 1.2rem 1.5rem;">
                <div style="font-weight: 700; color: var(--gray-800); font-size: 1.05rem;">${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--gray-500); font-family: monospace; background: #f1f5f9; display: inline-block; padding: 2px 8px; border-radius: 4px; margin-top: 5px; border: 1px solid var(--gray-200);">${item.code}</div>
            </td>
            <td style="text-align: right; padding-right: 1.5rem; vertical-align: middle;">
                <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary);">
                    ${bags} <span style="font-size: 0.7rem; color: var(--gray-400); font-weight: 600;">Bags</span>
                </div>
            </td>
            <td style="text-align: right; padding-right: 1.5rem; vertical-align: middle;">
                <div style="font-weight: 800; font-size: 1.1rem; color: var(--sky-700);">
                    ${currentStock.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})} <span style="font-size: 0.7rem; color: var(--gray-400); font-weight: 600;">KG</span>
                </div>
            </td>
            <td style="text-align: right; vertical-align: middle; color: var(--gray-600); font-weight: 600;">
                ${avgPrice > 0 ? avgPrice.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '---'}
            </td>
            <td style="text-align: right; vertical-align: middle; color: var(--gray-600); font-weight: 600;">
                ${maxPrice > 0 ? maxPrice.toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1}) : '---'}
            </td>
            <td style="text-align: right; padding-right: 1.5rem; vertical-align: middle;">
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
                    <div style="font-weight: 800; font-size: 1.15rem; color: var(--success);">
                        ${totalValue > 0 ? 'Rs. ' + totalValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : '---'}
                    </div>
                    <button class="btn btn-icon-sm" onclick="setRMItemTotalValue(${item.id})" title="Adjust Total Stock Value" style="font-size: 0.7rem; color: var(--gray-400);"><i class="fas fa-edit"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function setRMItemTotalValue(id) {
    const item = rmItems.find(i => i.id == id);
    if (!item) return;

    const currentStock = parseFloat(item.stock) || 0;
    if (currentStock <= 0) {
        alert('Cannot set value for 0 stock. Please add stock first.');
        return;
    }

    const currentVal = (currentStock * (parseFloat(item.base_price) || 0)).toFixed(0);
    const newVal = prompt(`Enter TOTAL VALUE (Rs.) for all ${currentStock.toFixed(1)} KG of "${item.name}":`, currentVal > 0 ? currentVal : '');
    if (newVal === null) return;

    const totalVal = parseFloat(newVal);
    if (isNaN(totalVal) || totalVal < 0) {
        alert('Please enter a valid total value.');
        return;
    }

    // Calculate implied price per KG
    const impliedPrice = totalVal / currentStock;

    try {
        const response = await fetch('api/sync.php?action=update_rm_item_base_price', {
            method: 'POST',
            body: JSON.stringify({ id, base_price: impliedPrice })
        });
        const result = await response.json();
        if (result.status === 'success') {
            item.base_price = impliedPrice;
            refreshRMInventoryBalance();
        }
    } catch (e) {
        console.error('Failed to update total value:', e);
        alert('Failed to save value. Check connection.');
    }
}

// --- RM Audit Functions ---

function refreshRMAudit() {
    const tbody = document.getElementById('rmAuditTable');
    if (!tbody) return;

    if (!rmItems || rmItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--gray-500);">No raw materials found.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    
    // Sort items by name
    const sortedItems = [...rmItems].sort((a, b) => a.name.localeCompare(b.name));

    sortedItems.forEach(item => {
        const sysStock = parseFloat(item.stock) || 0;
        const physStock = rmPhysicalStockMap[item.id] !== undefined ? rmPhysicalStockMap[item.id] : 0;
        const diff = physStock - sysStock;
        const isBalanced = Math.abs(diff) < 0.0001;
        const status = isBalanced ? 'Balanced' : (diff > 0 ? 'Excess' : 'Shortage');
        const statusColor = isBalanced ? '#64748b' : (diff > 0 ? '#16a34a' : '#dc2626');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 0.8rem 1.5rem;">
                <div style="font-weight: 700;">${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--gray-400); font-family: monospace;">${item.code}</div>
            </td>
            <td style="text-align: center; font-weight: 600; color: var(--gray-600);">${sysStock.toFixed(2)} ${item.unit}</td>
            <td style="text-align: center;">
                <input type="number" step="0.01" value="${physStock}" 
                    style="width: 100px; padding: 0.4rem; border: 2px solid var(--gray-200); border-radius: 6px; text-align: center; font-weight: 700;"
                    oninput="calculateRMAuditDifference(${item.id}, this.value)">
            </td>
            <td id="rmAuditDiff_${item.id}" style="text-align: center; font-weight: 700; color: ${statusColor};">
                ${diff > 0 ? '+' : ''}${diff.toFixed(2)}
            </td>
            <td style="text-align: center;">
                <span id="rmAuditStatus_${item.id}" class="badge" style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 50px; font-size: 0.75rem; font-weight: 800;">
                    ${status}
                </span>
            </td>
            <td style="text-align: center; padding-right: 1.5rem;">
                <button class="btn btn-sm" onclick="adjustSingleRMItem(${item.id})" style="background: var(--sky-100); color: var(--sky-700); font-weight: 700; border: none; padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.75rem;">Adjust</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function calculateRMAuditDifference(itemId, val) {
    const physStock = parseFloat(val) || 0;
    rmPhysicalStockMap[itemId] = physStock;
    localStorage.setItem('rmPhysicalStockMap', JSON.stringify(rmPhysicalStockMap)); // Save to storage

    const item = rmItems.find(i => i.id == itemId);
    const sysStock = item ? parseFloat(item.stock) : 0;
    const diff = physStock - sysStock;
    
    const diffEl = document.getElementById(`rmAuditDiff_${itemId}`);
    const statusEl = document.getElementById(`rmAuditStatus_${itemId}`);
    
    if (diffEl && statusEl) {
        const isBalanced = Math.abs(diff) < 0.0001;
        const status = isBalanced ? 'Balanced' : (diff > 0 ? 'Excess' : 'Shortage');
        const statusColor = isBalanced ? '#64748b' : (diff > 0 ? '#16a34a' : '#dc2626');
        
        diffEl.innerText = (diff > 0 ? '+' : '') + diff.toFixed(2);
        diffEl.style.color = statusColor;
        
        statusEl.innerText = status;
        statusEl.style.background = statusColor;
    }
}

async function saveRMAudit() {
    localStorage.setItem('rmPhysicalStockMap', JSON.stringify(rmPhysicalStockMap));
    alert('✅ Audit values saved to browser storage.');
}

function resetRMPhysicalStock() {
    if (!confirm('Are you sure you want to reset all physical stock entries to 0?')) return;
    rmPhysicalStockMap = {};
    localStorage.removeItem('rmPhysicalStockMap');
    refreshRMAudit();
}

async function archiveRMAuditReport() {
    if (!rmItems || rmItems.length === 0) return;
    
    const snapshot = rmItems.map(item => {
        const sys = parseFloat(item.stock) || 0;
        const phys = rmPhysicalStockMap[item.id] || 0;
        return {
            name: item.name,
            code: item.code,
            unit: item.unit,
            system: sys,
            physical: phys,
            difference: phys - sys
        };
    });

    const response = await fetch('api/sync.php?action=archive_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: `RM Monthly Audit - ${new Date().toLocaleDateString()}`,
            data: snapshot,
            report_type: 'RM'
        })
    });
    
    const res = await response.json();
    if (res.status === 'success') {
        alert('✅ RM Audit Report Archived!');
        if (typeof refreshArchivedReportsList === 'function') refreshArchivedReportsList();
    }
}

async function autoAdjustRMAll() {
    if (!verifyAdminAction()) return;

    const adjustments = [];
    for (const item of rmItems) {
        const sys = parseFloat(item.stock) || 0;
        const phys = rmPhysicalStockMap[item.id] || 0;
        const diff = phys - sys;
        
        if (Math.abs(diff) > 0.0001) {
            adjustments.push({
                rm_item_id: item.id,
                quantity: Math.abs(diff),
                type: diff > 0 ? 'IN' : 'OUT',
                notes: 'Audit Adjustment (Bulk)'
            });
        }
    }

    if (adjustments.length === 0) {
        alert('ℹ️ No discrepancies found to adjust.');
        return;
    }

    if (!confirm(`Are you sure? This will create ${adjustments.length} adjustment transactions to match physical stock.`)) return;

    const response = await fetch('api/sync.php?action=bulk_save_rm_transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: adjustments })
    });

    const res = await response.json();
    if (res.status === 'success') {
        alert('✅ Bulk Stock Adjustments Completed!');
        initApp(); // Refresh data and UI
    }
}

async function adjustSingleRMItem(itemId) {
    const item = rmItems.find(i => i.id == itemId);
    if (!item) return;

    const sys = parseFloat(item.stock) || 0;
    const phys = rmPhysicalStockMap[itemId] || 0;
    const diff = phys - sys;

    if (Math.abs(diff) < 0.0001) {
        alert('ℹ️ Item stock is already balanced.');
        return;
    }

    if (!verifyAdminAction()) return;

    if (!confirm(`Adjust ${item.name} stock level to match physical count (${phys})?`)) return;

    const adjustment = {
        rm_item_id: item.id,
        quantity: Math.abs(diff),
        type: diff > 0 ? 'IN' : 'OUT',
        notes: 'Audit Adjustment (Single)'
    };

    const response = await fetch('api/sync.php?action=save_rm_transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: adjustment })
    });

    const res = await response.json();
    if (res.status === 'success') {
        alert(`✅ ${item.name} Adjusted!`);
        initApp(); // Refresh
    }
}
function refreshRMAudit() {
    const tbody = document.getElementById('rmAuditTable');
    if (!tbody) return;

    if (!rmItems || rmItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--gray-500);">No raw materials found.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    
    // Sort items by name
    const sortedItems = [...rmItems].sort((a, b) => a.name.localeCompare(b.name));

    sortedItems.forEach(item => {
        const sysStock = parseFloat(item.stock) || 0;
        const physStock = rmPhysicalStockMap[item.id] !== undefined ? rmPhysicalStockMap[item.id] : 0;
        const diff = physStock - sysStock;
        const isBalanced = Math.abs(diff) < 0.0001;
        const status = isBalanced ? 'Balanced' : (diff > 0 ? 'Excess' : 'Shortage');
        const statusColor = isBalanced ? '#64748b' : (diff > 0 ? '#16a34a' : '#dc2626');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 0.8rem 1.5rem;">
                <div style="font-weight: 700;">${item.name}</div>
                <div style="font-size: 0.75rem; color: var(--gray-400); font-family: monospace;">${item.code}</div>
            </td>
            <td style="text-align: center; font-weight: 600; color: var(--gray-600);">${sysStock.toFixed(2)} ${item.unit}</td>
            <td style="text-align: center;">
                <input type="number" step="0.01" value="${physStock}" 
                    style="width: 100px; padding: 0.4rem; border: 2px solid var(--gray-200); border-radius: 6px; text-align: center; font-weight: 700;"
                    oninput="calculateRMAuditDifference(${item.id}, this.value)">
            </td>
            <td id="rmAuditDiff_${item.id}" style="text-align: center; font-weight: 700; color: ${statusColor};">
                ${diff > 0 ? '+' : ''}${diff.toFixed(2)}
            </td>
            <td style="text-align: center;">
                <span id="rmAuditStatus_${item.id}" class="badge" style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 50px; font-size: 0.75rem; font-weight: 800;">
                    ${status}
                </span>
            </td>
            <td style="text-align: center; padding-right: 1.5rem;">
                <button class="btn btn-sm" onclick="adjustSingleRMItem(${item.id})" style="background: var(--sky-100); color: var(--sky-700); font-weight: 700; border: none; padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.75rem;">Adjust</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function calculateRMAuditDifference(itemId, val) {
    const physStock = parseFloat(val) || 0;
    rmPhysicalStockMap[itemId] = physStock;
    localStorage.setItem('rmPhysicalStockMap', JSON.stringify(rmPhysicalStockMap)); // Save to storage

    const item = rmItems.find(i => i.id == itemId);
    const sysStock = item ? parseFloat(item.stock) : 0;
    const diff = physStock - sysStock;
    
    const diffEl = document.getElementById(`rmAuditDiff_${itemId}`);
    const statusEl = document.getElementById(`rmAuditStatus_${itemId}`);
    
    if (diffEl && statusEl) {
        const isBalanced = Math.abs(diff) < 0.0001;
        const status = isBalanced ? 'Balanced' : (diff > 0 ? 'Excess' : 'Shortage');
        const statusColor = isBalanced ? '#64748b' : (diff > 0 ? '#16a34a' : '#dc2626');
        
        diffEl.innerText = (diff > 0 ? '+' : '') + diff.toFixed(2);
        diffEl.style.color = statusColor;
        
        statusEl.innerText = status;
        statusEl.style.background = statusColor;
    }
}

async function saveRMAudit() {
    localStorage.setItem('rmPhysicalStockMap', JSON.stringify(rmPhysicalStockMap));
    alert('✅ Audit values saved to browser storage.');
}

function resetRMPhysicalStock() {
    if (!confirm('Are you sure you want to reset all physical stock entries to 0?')) return;
    rmPhysicalStockMap = {};
    localStorage.removeItem('rmPhysicalStockMap');
    refreshRMAudit();
}

async function archiveRMAuditReport() {
    if (!rmItems || rmItems.length === 0) return;
    
    const snapshot = rmItems.map(item => {
        const sys = parseFloat(item.stock) || 0;
        const phys = rmPhysicalStockMap[item.id] || 0;
        return {
            name: item.name,
            code: item.code,
            unit: item.unit,
            system: sys,
            physical: phys,
            difference: phys - sys
        };
    });

    const response = await fetch('api/sync.php?action=archive_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: `RM Monthly Audit - ${new Date().toLocaleDateString()}`,
            data: snapshot,
            report_type: 'RM'
        })
    });
    
    const res = await response.json();
    if (res.status === 'success') {
        alert('✅ RM Audit Report Archived!');
        if (typeof refreshArchivedReportsList === 'function') refreshArchivedReportsList();
    }
}

async function autoAdjustRMAll() {
    if (!verifyAdminAction()) return;

    const adjustments = [];
    for (const item of rmItems) {
        const sys = parseFloat(item.stock) || 0;
        const phys = rmPhysicalStockMap[item.id] || 0;
        const diff = phys - sys;
        
        if (Math.abs(diff) > 0.0001) {
            adjustments.push({
                rm_item_id: item.id,
                quantity: Math.abs(diff),
                type: diff > 0 ? 'IN' : 'OUT',
                notes: 'Audit Adjustment (Bulk)'
            });
        }
    }

    if (adjustments.length === 0) {
        alert('ℹ️ No discrepancies found to adjust.');
        return;
    }

    if (!confirm(`Are you sure? This will create ${adjustments.length} adjustment transactions to match physical stock.`)) return;

    const response = await fetch('api/sync.php?action=bulk_save_rm_transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: adjustments })
    });

    const res = await response.json();
    if (res.status === 'success') {
        alert('✅ Bulk Stock Adjustments Completed!');
        initApp(); // Refresh data and UI
    }
}

async function adjustSingleRMItem(itemId) {
    const item = rmItems.find(i => i.id == itemId);
    if (!item) return;

    const sys = parseFloat(item.stock) || 0;
    const phys = rmPhysicalStockMap[itemId] || 0;
    const diff = phys - sys;

    if (Math.abs(diff) < 0.0001) {
        alert('ℹ️ Item stock is already balanced.');
        return;
    }

    if (!verifyAdminAction()) return;

    if (!confirm(`Adjust ${item.name} stock level to match physical count (${phys})?`)) return;

    const adjustment = {
        rm_item_id: item.id,
        quantity: Math.abs(diff),
        type: diff > 0 ? 'IN' : 'OUT',
        notes: 'Audit Adjustment (Single)'
    };

    const response = await fetch('api/sync.php?action=save_rm_transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: adjustment })
    });

    const res = await response.json();
    if (res.status === 'success') {
        alert(`✅ ${item.name} Adjusted!`);
        initApp(); // Refresh
    }
}

function verifyAdminAction() {
    const code = prompt("Security Check: Enter Admin Password to authorize this adjustment:");
    if (code === null) return false;
    
    // Find admin user or use default
    const adminUser = users.find(u => u.role === 'Admin');
    const validCode = adminUser ? adminUser.password : 'admin123';
    
    if (code === validCode) return true;
    
    alert("❌ Invalid password! Authorization failed.");
    return false;
}

function printRMAudit() {
    window.print();
}


// ==================== STORE MODULE LOGIC ====================

// --- Code Generation (Sequential Gap Filling) ---
function generateStoreSubCategoryCode(mainCode) {
    const existingCodes = storeSubCategories
        .filter(s => s.code.startsWith(mainCode))
        .map(s => s.code.substring(mainCode.length));
    
    // Find first gap in 001, 002...
    let i = 1;
    while (true) {
        const suffix = i.toString().padStart(3, '0');
        if (!existingCodes.includes(suffix)) {
            return mainCode + suffix;
        }
        i++;
    }
}

function generateStoreItemCode(subCode) {
    const existingCodes = storeItems
        .filter(i => i.code.startsWith(subCode))
        .map(i => i.code.substring(subCode.length));
    
    // Find first gap in 0001, 0002...
    let i = 1;
    while (true) {
        const suffix = i.toString().padStart(4, '0');
        if (!existingCodes.includes(suffix)) {
            return subCode + suffix;
        }
        i++;
    }
}

// --- Data Persistence ---
async function saveStoreToDB(action, payload) {
    try {
        const response = await fetch(`api/sync.php?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status === 'success') {
            await initApp(); // Refresh local data
            return result;
        } else {
            alert('Error: ' + result.message);
            return null;
        }
    } catch (e) {
        console.error('Store Save Error:', e);
        return null;
    }
}

// --- Store Inventory Module ---

function toggleMainCategoryForm() {
    const container = document.getElementById('newMainCategoryFormContainer');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
        if (container.style.display === 'block') {
            document.getElementById('storeCatName').focus();
        }
    }
}

async function addStoreCategory() {
    const name = document.getElementById('storeCatName').value.trim();
    const code = document.getElementById('storeCatCodeManual').value.trim().toUpperCase();
    if (!name || !code) return alert('Name and Category Code are required.');
    
    if (storeMainCategories.some(c => c.code === code)) return alert('Category code already exists!');
    
    const res = await saveStoreToDB('save_store_category', { type: 'main', category: { name, code } });
    if (res) {
        document.getElementById('storeCatName').value = '';
        document.getElementById('storeCatCodeManual').value = '';
        toggleMainCategoryForm();
        refreshStoreInventory();
    }
}

async function editStoreCategory(id, type) {
    const categories = type === 'main' ? storeMainCategories : storeSubCategories;
    const cat = categories.find(c => c.id == id);
    if (!cat) return;

    const newName = prompt(`Enter new name for ${type} category:`, cat.name);
    if (!newName || newName === cat.name) return;

    const payload = { type: type, category: { id: id, name: newName, code: cat.code, main_id: cat.main_id } };
    const res = await saveStoreToDB('save_store_category', payload);
    if (res) refreshStoreInventory();
}

async function addStoreSubCategory(mainId, mainCode, subName) {
    if (!subName) return alert('Enter sub-category name');
    const subCode = generateStoreSubCategoryCode(mainCode);
    const res = await saveStoreToDB('save_store_category', { type: 'sub', category: { main_id: mainId, name: subName, code: subCode } });
    if (res) refreshStoreInventory();
}

async function deleteStoreCategory(id, type) {
    const confirmMsg = type === 'main' 
        ? 'Are you sure? Delete this Category? It must be empty.' 
        : 'Are you sure? Delete this Sub-Category? It must be empty.';
    if (!confirm(confirmMsg)) return;
    const res = await saveStoreToDB('delete_store_category', { id, type });
    if (res) refreshStoreInventory();
}

// --- Item Management ---
async function addStoreItem(subId, subCode, itemName, openingStock, threshold) {
    if (!itemName) return alert('Item name is required');
    const itemCode = generateStoreItemCode(subCode);
    const res = await saveStoreToDB('save_store_item', { item: { sub_id: subId, name: itemName, code: itemCode, opening_stock: openingStock, stock: openingStock, low_stock_threshold: threshold } });
    if (res) refreshStoreInventory();
}

async function deleteStoreItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const res = await saveStoreToDB('delete_store_item', { id });
    if (res) refreshStoreInventory();
}

async function editStoreItem(id) {
    const itm = storeItems.find(i => i.id == id);
    if (!itm) return;

    const newName = prompt('Enter new item name:', itm.name);
    if (!newName) return;
    const newStock = prompt('Update current stock:', itm.stock);
    if (newStock === null) return;
    const newThreshold = prompt('Update low stock threshold:', itm.low_stock_threshold);
    if (newThreshold === null) return;

    const payload = { item: { id, sub_id: itm.sub_id, name: newName, code: itm.code, opening_stock: itm.opening_stock, stock: newStock, low_stock_threshold: newThreshold } };
    const res = await saveStoreToDB('save_store_item', payload);
    if (res) refreshStoreInventory();
}

// --- Transaction Functions ---
async function saveStoreInward() {
    const itemId = document.getElementById('storeInwardItemSelect').value;
    const qty = parseFloat(document.getElementById('storeInwardQty').value);
    const source = document.getElementById('storeInwardSource').value;
    const notes = document.getElementById('storeInwardNotes').value;
    if (!itemId || isNaN(qty) || qty <= 0) return alert('Valid item and quantity required');
    
    const res = await saveStoreToDB('save_store_transaction', { 
        transaction: { 
            item_id: itemId, 
            quantity: qty, 
            type: 'INWARD', 
            source_or_person: source, 
            notes: notes 
        } 
    });
    if (res) {
        alert('Stock received successfully');
        document.getElementById('storeInwardQty').value = 1;
        document.getElementById('storeInwardSource').value = '';
        document.getElementById('storeInwardNotes').value = '';
        refreshTransactions().then(() => {
            refreshStoreDashboard();
            refreshStoreInwards();
            refreshStoreInwardHistory();
        });
    }
}

async function saveStoreOutward() {
    const itemId = document.getElementById('storeOutwardItemSelect').value;
    const qty = parseFloat(document.getElementById('storeOutwardQty').value);
    const issuedTo = document.getElementById('storeIssuedTo').value.trim();
    const issuedBy = document.getElementById('storeIssuedBy').value.trim();
    const purpose = document.getElementById('storePurpose').value.trim();
    const notes = document.getElementById('storeIssueNotes').value;
    
    if (!itemId || isNaN(qty) || qty <= 0 || !issuedTo) return alert('At least Item, Qty and Issued To are required');
    
    const item = storeItems.find(i => i.id == itemId);
    if (item && item.stock < qty) return alert('Insufficient stock! Current balance: ' + item.stock);

    const res = await saveStoreToDB('save_store_transaction', { 
        transaction: { 
            item_id: itemId, 
            quantity: qty, 
            type: 'OUTWARD', 
            issued_to: issuedTo,
            issued_by: issuedBy,
            purpose: purpose,
            notes: notes 
        } 
    });
    if (res) {
        alert('Item issued successfully');
        
        // Auto-learning: Save new entries to master lists automatically if they don't exist
        if (issuedTo && !storeMasterLists.issued_to.includes(issuedTo)) storeMasterLists.issued_to.push(issuedTo);
        if (issuedBy && !storeMasterLists.issued_by.includes(issuedBy)) storeMasterLists.issued_by.push(issuedBy);
        if (purpose && !storeMasterLists.purpose.includes(purpose)) storeMasterLists.purpose.push(purpose);
        
        saveAllStoreLists(true); // Silent save

        document.getElementById('storeOutwardQty').value = '';
        // Note: Don't clear issued_to/by/purpose if user wants to repeat, but usually better to clear for safety
        document.getElementById('storeIssuedTo').value = '';
        document.getElementById('storeIssuedBy').value = '';
        document.getElementById('storePurpose').value = '';
        document.getElementById('storeIssueNotes').value = '';
        refreshTransactions().then(() => {
            refreshStoreDashboard();
            refreshStoreOutwards();
            refreshStoreOutwardHistory();
            refreshStoreMasterLists();
        });
    }
}

// --- Refresh Functions (UI) ---

function refreshStoreDashboard() {
    const catCount = storeMainCategories.length;
    const itemCount = storeItems.length;
    const lowStockItems = storeItems.filter(i => parseFloat(i.stock) <= parseFloat(i.low_stock_threshold));
    const lowStockCount = lowStockItems.length;
    
    if (document.getElementById('storeDashCatCount')) document.getElementById('storeDashCatCount').innerText = catCount;
    if (document.getElementById('storeDashItemCount')) document.getElementById('storeDashItemCount').innerText = itemCount;
    if (document.getElementById('storeDashLowStock')) document.getElementById('storeDashLowStock').innerText = lowStockCount;
    
    // Low Stock Alerts
    const alertSection = document.getElementById('storeLowStockAlertSection');
    const alertContainer = document.getElementById('storeLowStockAlerts');
    if (alertSection && alertContainer) {
        if (lowStockCount > 0) {
            alertSection.style.display = 'block';
            alertContainer.innerHTML = lowStockItems.map(i => {
                const isCritical = parseFloat(i.stock) <= 0;
                const bgColor = isCritical ? '#fef2f2' : '#fffbeb';
                const borderColor = isCritical ? '#fee2e2' : '#fef3c7';
                const textColor = isCritical ? '#991b1b' : '#92400e';
                const tagColor = isCritical ? '#ef4444' : '#f59e0b';
                
                return `
                    <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 16px; padding: 1.2rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="background: ${tagColor}; width: 10px; height: 40px; border-radius: 5px;"></div>
                            <div>
                                <h4 style="margin: 0; font-size: 1rem; color: ${textColor}; font-weight: 800;">${i.name}</h4>
                                <span style="font-size: 0.7rem; color: var(--gray-500); font-weight: 700; text-transform: uppercase;">CODE: ${i.code}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.2rem; font-weight: 900; color: ${textColor};">${i.stock}</div>
                            <div style="font-size: 0.65rem; color: var(--gray-400); font-weight: 700;">Threshold: ${i.low_stock_threshold}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            alertSection.style.display = 'none';
        }
    }

    const activityHtml = storeTransactions.slice(0, 10).map(t => `
        <div style="padding: 0.8rem; border-bottom: 1px solid var(--gray-100); font-size: 0.9rem; display: flex; justify-content: space-between;">
            <span><strong>${formatDate(t.date, false)}</strong>: ${t.type === 'INWARD' ? '📥' : '📤'} ${t.itemName} (${t.quantity})</span>
            <span style="color: var(--gray-400);">By: ${t.source_or_person || 'N/A'}</span>
        </div>
    `).join('') || '<p style="text-align: center; color: var(--gray-400); padding: 2rem;">No recent activities.</p>';
    
    if (document.getElementById('storeRecentActivityLog')) document.getElementById('storeRecentActivityLog').innerHTML = activityHtml;
}

function refreshStoreInwards() {
    const select = document.getElementById('storeInwardItemSelect');
    if (!select) return;
    const items = storeItems.slice().sort((a,b) => a.name.localeCompare(b.name));
    select.innerHTML = '<option value="">-- Select Item --</option>' + 
        items.map(i => `<option value="${i.id}">${i.code} - ${i.name} (Stock: ${i.stock})</option>`).join('');
    
    // Set current month/year if not set
    const mSelect = document.getElementById('inwardHistMonth');
    const ySelect = document.getElementById('inwardHistYear');
    if (mSelect && !mSelect.dataset.init) {
        const now = new Date();
        mSelect.value = now.getMonth() + 1;
        ySelect.value = now.getFullYear();
        mSelect.dataset.init = "true";
    }
    refreshStoreInwardHistory();
}

function refreshStoreOutwards() {
    const select = document.getElementById('storeOutwardItemSelect');
    if (!select) return;
    const items = storeItems.slice().sort((a,b) => a.name.localeCompare(b.name));
    select.innerHTML = '<option value="">-- Select Item --</option>' + 
        items.map(i => `<option value="${i.id}">${i.code} - ${i.name} (Stock: ${i.stock})</option>`).join('');
    
    // Set current month/year if not set
    const mSelect = document.getElementById('outwardHistMonth');
    const ySelect = document.getElementById('outwardHistYear');
    if (mSelect && !mSelect.dataset.init) {
        const now = new Date();
        mSelect.value = now.getMonth() + 1;
        ySelect.value = now.getFullYear();
        mSelect.dataset.init = "true";
    }
    refreshStoreOutwardHistory();
    // Initialize Smart Dropdowns
    ['issued_to', 'issued_by', 'purpose'].forEach(t => refreshSmartDropdown(t));
}

// ==================== SMART DROPDOWN CONTROLLERS ====================

function refreshSmartDropdown(type, query = '') {
    const container = document.getElementById(`dropdown_${type}`);
    if (!container) return;
    
    let list = storeMasterLists[type] || [];
    if (query) {
        list = list.filter(item => item.toLowerCase().includes(query.toLowerCase()));
    }
    list.sort();

    const html = `
        <div style="flex: 1; overflow-y: auto;">
            ${list.map(val => `
                <div class="dropdown-item-custom" onclick="selectSmartItem('${type}', '${val.replace(/'/g, "\\'")}')" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f8fafc; padding: 12px;">
                    <span style="font-weight: 500;">${val}</span>
                    <button type="button" onclick="event.stopPropagation(); deleteSmartItem('${type}', '${val.replace(/'/g, "\\'")}')" style="background:#fee2e2; color:#ef4444; border:none; padding:4px 8px; border-radius:6px; cursor:pointer; font-size: 0.75rem;">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `).join('')}
            ${list.length === 0 ? `<div style="padding:20px; color:#94a3b8; font-style:italic; font-size:0.85rem; text-align:center;">Empty list</div>` : ''}
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 5px;">
            <button type="button" onclick="addNewFromInput('${type}')" style="width:100%; background:#ecfdf5; color:#059669; border:none; padding:10px; border-radius:8px; font-weight:800; cursor:pointer; font-size:0.85rem;">
                <i class="fas fa-plus"></i> + Add Current Text to List
            </button>
        </div>
    `;

    container.innerHTML = html;
    
    // Manage indicator display
    const indicator = document.getElementById(`add_indicator_${type}`);
    if (indicator) {
        const inputVal = document.querySelector(`.smart-input[data-type="${type}"]`).value.trim();
        const exactMatch = list.some(item => item.toLowerCase() === inputVal.toLowerCase());
        indicator.style.display = (inputVal && !exactMatch) ? 'block' : 'none';
        if (inputVal && !exactMatch) {
            indicator.innerText = `+ Add "${inputVal}" to List`;
        }
    }
}

function selectSmartItem(type, val) {
    const input = document.querySelector(`.smart-input[data-type="${type}"]`);
    if (input) {
        input.value = val;
        document.getElementById(`dropdown_${type}`).style.display = 'none';
        document.getElementById(`add_indicator_${type}`).style.display = 'none';
    }
}

async function deleteSmartItem(type, val) {
    if (!confirm(`Delete "${val}" from the list?`)) return;
    storeMasterLists[type] = storeMasterLists[type].filter(item => item !== val);
    await saveAllStoreLists(true);
    refreshSmartDropdown(type, document.querySelector(`.smart-input[data-type="${type}"]`).value);
}

async function addNewFromInput(type) {
    const input = document.querySelector(`.smart-input[data-type="${type}"]`);
    const val = input.value.trim();
    if (!val) return;
    if (!storeMasterLists[type].includes(val)) {
        storeMasterLists[type].push(val);
        await saveAllStoreLists(true);
        refreshSmartDropdown(type, val);
        alert(`Added "${val}" to your list!`);
        document.getElementById(`add_indicator_${type}`).style.display = 'none';
    }
}

async function saveAllStoreLists(silent = false) {
    const res = await saveStoreToDB('save_settings', { 
        category: 'store_lists', 
        settings: { 
            issued_to: JSON.stringify(storeMasterLists.issued_to),
            issued_by: JSON.stringify(storeMasterLists.issued_by),
            purpose: JSON.stringify(storeMasterLists.purpose)
        } 
    });
    if (res && !silent) {
        alert('Selection lists updated successfully.');
    }
    return res;
}

// Event Listeners for Smart Inputs
document.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('smart-input')) {
        const type = e.target.dataset.type;
        document.getElementById(`dropdown_${type}`).style.display = 'block';
        refreshSmartDropdown(type, e.target.value);
    }
});

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('smart-input')) {
        const type = e.target.dataset.type;
        refreshSmartDropdown(type, e.target.value);
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.store-field')) {
        document.querySelectorAll('.smart-dropdown').forEach(d => d.style.display = 'none');
        document.querySelectorAll('.add-new-indicator').forEach(i => i.style.display = 'none');
    }
});

function refreshStoreInwardHistory() {
    const month = parseInt(document.getElementById('inwardHistMonth').value);
    const year = parseInt(document.getElementById('inwardHistYear').value);
    const tbody = document.getElementById('storeInwardHistoryBody');
    if (!tbody) return;

    const filtered = storeTransactions.filter(t => {
        if (t.type !== 'INWARD') return false;
        const d = new Date(t.date);
        return (d.getMonth() + 1) === month && d.getFullYear() === year;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 3rem; color: #94a3b8; font-style: italic;">No inward records found for this period.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(t => `
        <tr style="background: white; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
            <td style="padding: 15px; border-radius: 10px 0 0 10px;">
                <div style="font-weight: 700; color: #1e293b;">${formatDate(t.date)}</div>

            </td>
            <td style="padding: 15px; font-family: monospace; font-weight: 700; color: #0ea5e9;">${t.itemCode}</td>
            <td style="padding: 15px; font-weight: 600;">${t.itemName}</td>
            <td style="padding: 15px; text-align: center;"><span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 800;">+${t.quantity}</span></td>
            <td style="padding: 15px; color: #475569; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${t.source_or_person || '-'}</td>
            <td style="padding: 15px; text-align: right; border-radius: 0 10px 10px 0;">
                <button class="btn btn-sm" onclick="deleteStoreTransaction(${t.id}, 'INWARD')" style="background: #fee2e2; color: #ef4444; border: none; padding: 5px 12px; border-radius: 6px; font-weight: 700;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function refreshStoreOutwardHistory() {
    const month = parseInt(document.getElementById('outwardHistMonth').value);
    const year = parseInt(document.getElementById('outwardHistYear').value);
    const tbody = document.getElementById('storeOutwardHistoryBody');
    if (!tbody) return;

    const filtered = storeTransactions.filter(t => {
        if (t.type !== 'OUTWARD') return false;
        const d = new Date(t.date);
        return (d.getMonth() + 1) === month && d.getFullYear() === year;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 3rem; color: #94a3b8; font-style: italic;">No outward records found for this period.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(t => `
        <tr style="background: white; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
            <td style="padding: 15px; border-radius: 10px 0 0 10px;">
                <div style="font-weight: 700; color: #1e293b;">${formatDate(t.date)}</div>

            </td>
            <td style="padding: 15px; font-family: monospace; font-weight: 700; color: #f43f5e;">${t.itemCode}</td>
            <td style="padding: 15px; font-weight: 600;">${t.itemName}</td>
            <td style="padding: 15px; text-align: center;"><span style="background: #fff1f2; color: #be123c; padding: 4px 10px; border-radius: 6px; font-weight: 800;">-${t.quantity}</span></td>
            <td style="padding: 15px; color: #475569;">
                <div style="font-weight: 700;">To: ${t.issued_to || '-'}</div>
                <div style="font-size: 0.7rem;">By: ${t.issued_by || '-'}</div>
            </td>
            <td style="padding: 15px; text-align: right; border-radius: 0 10px 10px 0;">
                <button class="btn btn-sm" onclick="deleteStoreTransaction(${t.id}, 'OUTWARD')" style="background: #fee2e2; color: #ef4444; border: none; padding: 5px 12px; border-radius: 6px; font-weight: 700;">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteStoreTransaction(id, type) {
    if (!confirm('Are you sure you want to delete this record? This will NOT affect current stock balance.')) return;
    const res = await saveStoreToDB('delete_store_transaction', { id });
    if (res) {
        refreshTransactions().then(() => {
            if (type === 'INWARD') refreshStoreInwardHistory();
            else refreshStoreOutwardHistory();
        });
    }
}

function printStoreHistory(type) {
    const monthEl = document.getElementById(type === 'INWARD' ? 'inwardHistMonth' : 'outwardHistMonth');
    const yearEl = document.getElementById(type === 'INWARD' ? 'inwardHistYear' : 'outwardHistYear');
    const monthName = monthEl.options[monthEl.selectedIndex].text;
    const yearValue = yearEl.value;

    const content = document.getElementById(type === 'INWARD' ? 'storeInwardHistoryTableContainer' : 'storeOutwardHistoryTableContainer').innerHTML;
    
    // Create print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Store ${type} Report - ${monthName} ${yearValue}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 11pt; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    .btn-sm { display: none; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Store ${type} History Report</h1>
                    <h3>Period: ${monthName} ${yearValue}</h3>
                    <p>Report Generated On: ${new Date().toLocaleString()}</p>
                </div>
                ${content}
                <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                    <div>___________________<br>Store In-charge</div>
                    <div>___________________<br>Factory Manager</div>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

function refreshStoreInventory() {
    const container = document.getElementById('storeCategoriesContainer');
    if (!container) return;
    container.innerHTML = '';
    
    if (storeMainCategories.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--gray-400);">No categories created yet. Click "New Main Category" to start.</div>';
        return;
    }

    storeMainCategories.forEach(cat => {
        const isCollapsed = !storeExpandedIds.has('cat_' + cat.id);
        const card = document.createElement('div');
        card.className = 'store-cat-card';
        card.style.marginBottom = '2rem';
        card.style.border = '1px solid var(--sky-200)';
        card.style.borderRadius = '20px';
        card.style.overflow = 'hidden';
        card.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.05)';
        
        const header = document.createElement('div');
        header.style.padding = '1.2rem 2rem';
        header.style.background = 'linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%)';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.cursor = 'pointer';
        header.style.borderLeft = '6px solid var(--sky-600)';
        
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="background: white; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-sm);">
                    <i class="fas ${isCollapsed ? 'fa-box' : 'fa-box-open'}" style="color: var(--sky-600); font-size: 1.4rem;"></i>
                </div>
                <div>
                    <h4 style="margin:0; font-weight: 800; color: #0c4a6e; font-size: 1.25rem;">${cat.name}</h4>
                    <span style="background: #bae6fd; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">CODE: ${cat.code}</span>
                </div>
            </div>
            <div style="display: flex; gap: 0.8rem; align-items: center;">
                <button class="btn btn-sm" onclick="event.stopPropagation(); toggleStoreForm('addSub_${cat.id}')" style="background: var(--sky-600); color: white; border-radius: 8px; padding: 6px 12px;">
                    <i class="fas fa-plus"></i> Add Sub
                </button>
                <button class="btn btn-sm" onclick="event.stopPropagation(); editStoreCategory(${cat.id}, 'main')" style="background: #0ea5e9; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 700;">
                    Edit
                </button>
                <button class="btn btn-sm" onclick="event.stopPropagation(); deleteStoreCategory(${cat.id}, 'main')" style="background: #ef4444; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 700;">
                    Delete
                </button>
                <i class="fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}" style="color: var(--sky-300); margin-left: 0.5rem;"></i>
            </div>
        `;
        header.onclick = () => {
            if (storeExpandedIds.has('cat_' + cat.id)) storeExpandedIds.delete('cat_' + cat.id);
            else storeExpandedIds.add('cat_' + cat.id);
            refreshStoreInventory();
        };
        card.appendChild(header);

        // Inline Add Sub Form
        const addSubForm = document.createElement('div');
        addSubForm.id = `addSub_${cat.id}`;
        addSubForm.style.display = 'none';
        addSubForm.style.padding = '1.5rem';
        addSubForm.style.background = '#f1f5f9';
        addSubForm.style.borderBottom = '1px solid var(--gray-200)';
        addSubForm.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: flex-end;">
                <div style="flex: 1;">
                    <label style="font-weight: 700; font-size: 0.85rem; color: var(--gray-600);">New Sub-Category Name</label>
                    <input type="text" id="newSubName_${cat.id}" class="form-control" placeholder="e.g. Spare Parts">
                </div>
                <button class="btn btn-primary" onclick="addStoreSubCategory(${cat.id}, '${cat.code}', document.getElementById('newSubName_${cat.id}').value)">Create Sub-Category</button>
                <button class="btn btn-secondary" onclick="toggleStoreForm('addSub_${cat.id}')">Cancel</button>
            </div>
        `;
        card.appendChild(addSubForm);

        if (!isCollapsed) {
            const body = document.createElement('div');
            body.style.padding = '1.5rem 2rem';
            body.style.background = 'white';
            
            const subs = storeSubCategories.filter(s => s.main_id == cat.id);
            subs.forEach(sub => {
                const subIsCollapsed = !storeExpandedIds.has('sub_' + sub.id);
                const subDiv = document.createElement('div');
                subDiv.style.marginBottom = '1.5rem';
                subDiv.style.border = '1px solid #dcfce7';
                subDiv.style.borderRadius = '16px';
                subDiv.style.overflow = 'hidden';
                
                const subHeader = document.createElement('div');
                subHeader.style.padding = '1rem 1.5rem';
                subHeader.style.background = '#f0fdf4';
                subHeader.style.display = 'flex';
                subHeader.style.justifyContent = 'space-between';
                subHeader.style.alignItems = 'center';
                subHeader.style.cursor = 'pointer';
                subHeader.style.borderLeft = '5px solid #22c55e';
                
                subHeader.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <i class="fas ${subIsCollapsed ? 'fa-plus-circle' : 'fa-minus-circle'}" style="color: #22c55e; font-size: 1.2rem;"></i>
                        <div>
                            <span style="font-weight: 800; color: #14532d; font-size: 1.05rem;">${sub.name}</span>
                            <span style="margin-left: 0.5rem; color: #3f6212; background: #d9f99d; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">${sub.code}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                         <button class="btn btn-sm" onclick="event.stopPropagation(); toggleStoreForm('addItem_${sub.id}')" style="background: #16a34a; color: white; border-radius: 6px; padding: 4px 10px; font-size: 0.8rem;">
                            <i class="fas fa-plus"></i> Add Item
                        </button>
                        <button class="btn btn-sm" onclick="event.stopPropagation(); editStoreCategory(${sub.id}, 'sub')" style="background: #16a34a; color: white; padding: 6px 12px; border-radius: 6px; border: none; font-weight: 700;">
                            Edit
                        </button>
                        <button class="btn btn-sm" onclick="event.stopPropagation(); deleteStoreCategory(${sub.id}, 'sub')" style="background: #ef4444; color: white; padding: 6px 12px; border-radius: 6px; border: none; font-weight: 700;">
                            Delete
                        </button>
                    </div>
                `;
                subHeader.onclick = () => {
                    if (storeExpandedIds.has('sub_' + sub.id)) storeExpandedIds.delete('sub_' + sub.id);
                    else storeExpandedIds.add('sub_' + sub.id);
                    refreshStoreInventory();
                };
                subDiv.appendChild(subHeader);

                // Inline Add Item Form
                const addItemForm = document.createElement('div');
                addItemForm.id = `addItem_${sub.id}`;
                addItemForm.style.display = 'none';
                addItemForm.style.padding = '1.2rem';
                addItemForm.style.background = '#f8fafc';
                addItemForm.style.borderBottom = '1px solid #e2e8f0';
                addItemForm.innerHTML = `
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 1rem; align-items: flex-end;">
                        <div>
                            <label style="font-weight: 700; font-size: 0.75rem; color: var(--gray-600);">New Item Name</label>
                            <input type="text" class="form-control form-control-sm" placeholder="Part Name / Item..">
                        </div>
                        <div>
                            <label style="font-weight: 700; font-size: 0.75rem; color: var(--gray-600);">Opening Stock</label>
                            <input type="number" class="form-control form-control-sm" value="0">
                        </div>
                        <div>
                            <label style="font-weight: 700; font-size: 0.75rem; color: var(--gray-600);">Low Stock Limit</label>
                            <input type="number" class="form-control form-control-sm" value="5">
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-success btn-sm" onclick="const p=this.parentElement.parentElement; addStoreItem(${sub.id}, '${sub.code}', p.children[0].querySelector('input').value, p.children[1].querySelector('input').value, p.children[2].querySelector('input').value)">Add</button>
                            <button class="btn btn-secondary btn-sm" onclick="toggleStoreForm('addItem_${sub.id}')">X</button>
                        </div>
                    </div>
                `;
                subDiv.appendChild(addItemForm);

                if (!subIsCollapsed) {
                    const subBody = document.createElement('div');
                    subBody.style.padding = '1.5rem';
                    
                    const itms = storeItems.filter(i => i.sub_id == sub.id);
                    if (itms.length > 0) {
                        let tableHtml = `
                            <table class="table" style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
                                <thead style="color: var(--gray-500); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px;">
                                    <tr>
                                        <th style="padding: 10px;">Item Details</th>
                                        <th style="padding: 10px; text-align: center;">Stock Status</th>
                                        <th style="padding: 10px; text-align: right;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                        `;
                        itms.forEach(itm => {
                            const isLow = parseFloat(itm.stock) <= parseFloat(itm.low_stock_threshold);
                            tableHtml += `
                                <tr style="background: #f8fafc; transition: all 0.2s;">
                                    <td style="padding: 12px 15px; border-radius: 12px 0 0 12px;">
                                        <div style="font-weight: 700; color: #1e293b;">${itm.name}</div>
                                        <div style="font-size: 0.7rem; color: var(--sky-600); font-weight: 600;">CODE: ${itm.code}</div>
                                    </td>
                                    <td style="padding: 12px 15px; text-align: center;">
                                        <div style="display: inline-flex; align-items: center; gap: 0.8rem;">
                                            <div style="font-size: 1.1rem; font-weight: 900; color: ${isLow ? '#ef4444' : '#0f172a'};">${itm.stock}</div>
                                            <div style="font-size: 0.7rem; color: var(--gray-400); background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">Limit: ${itm.low_stock_threshold}</div>
                                        </div>
                                    </td>
                                    <td style="padding: 12px 15px; text-align: right; border-radius: 0 12px 12px 0;">
                                        <button class="btn btn-sm" onclick="editStoreItem(${itm.id})" style="background: #0ea5e9; color: white; border: none; padding: 6px 15px; border-radius: 8px; font-weight: 700;">
                                            Edit
                                        </button>
                                        <button class="btn btn-sm" onclick="deleteStoreItem(${itm.id})" style="background: #ef4444; color: white; border: none; padding: 6px 15px; border-radius: 8px; margin-left: 5px; font-weight: 700;">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            `;
                        });
                        tableHtml += '</tbody></table>';
                        subBody.innerHTML = tableHtml;
                    } else {
                        subBody.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-400); font-style: italic; background: #fdfdfd; border: 1px dashed #eee; border-radius: 12px;">No items found. Click "+ Add Item" above to create one.</div>';
                    }
                    subDiv.appendChild(subBody);
                }
                body.appendChild(subDiv);
            });
            card.appendChild(body);
        }
        container.appendChild(card);
    });
}

function toggleStoreForm(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
    if (el.style.display === 'block') {
        const input = el.querySelector('input');
        if (input) input.focus();
    }
}

function refreshStoreItems() {
    const container = document.getElementById('storeItemRecordsContainer');
    if (!container) return;
    const filter = document.getElementById('storeItemsSearch').value.toLowerCase();
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Stock Balance</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const filteredItems = storeItems.filter(i => 
        i.name.toLowerCase().includes(filter) || 
        i.code.toLowerCase().includes(filter)
    );
    
    if (filteredItems.length === 0) {
        html += '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--gray-400);">No matching items found.</td></tr>';
    } else {
        filteredItems.forEach(i => {
            const isLow = parseFloat(i.stock) <= parseFloat(i.low_stock_threshold);
            html += `
                <tr>
                    <td><strong>${i.code}</strong></td>
                    <td>${i.name}</td>
                    <td><span style="font-size: 1.1rem; font-weight: 700;">${i.stock}</span></td>
                    <td>
                        ${isLow ? '<span style="color: var(--orange-600); background: var(--orange-50); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.8rem;">⚠️ LOW STOCK</span>' : '<span style="color: var(--green-600); background: var(--green-50); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.8rem;">✅ NORMAL</span>'}
                    </td>
                </tr>
            `;
        });
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function refreshStoreAudit() {
    const container = document.getElementById('storeAuditItemsList');
    if (!container) return;
    
    let html = `
        <table class="table table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
            <thead style="background: #f1f5f9;">
                <tr style="color: #475569; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">
                    <th style="padding: 15px; border: 1px solid #e2e8f0;">Material Name / Code</th>
                    <th style="padding: 15px; border: 1px solid #e2e8f0; text-align: center;">System Stock</th>
                    <th style="padding: 15px; border: 1px solid #e2e8f0; width: 150px; text-align: center;">Physical Stock</th>
                    <th style="padding: 15px; border: 1px solid #e2e8f0; text-align: center;">Difference</th>
                    <th style="padding: 15px; border: 1px solid #e2e8f0; text-align: center;">Status</th>
                    <th style="padding: 15px; border: 1px solid #e2e8f0; text-align: right;">Action</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    storeItems.forEach(i => {
        const sysVal = parseFloat(i.stock) || 0;
        const diff = -sysVal; // Default since physical is 0
        const statusText = sysVal === 0 ? 'Matched' : 'Shortage';
        const color = sysVal === 0 ? '#10b981' : '#ef4444'; // Green for matched or starting zero
        const bgColor = sysVal === 0 ? '#ecfdf5' : '#fee2e2';

        html += `
            <tr style="background: white;" id="audit_row_${i.id}">
                <td style="padding: 15px; border: 1px solid #f1f5f9;">
                    <div style="font-weight: 800; color: #1e293b;">${i.name}</div>
                    <div style="font-size: 0.75rem; color: #64748b; font-family: monospace;">${i.code}</div>
                </td>
                <td style="padding: 15px; border: 1px solid #f1f5f9; text-align: center;">
                    <span style="font-weight: 700; color: #1e293b;">${i.stock}</span>
                </td>
                <td style="padding: 15px; border: 1px solid #f1f5f9; text-align: center;">
                    <input type="number" class="form-control store-audit-input" 
                           data-id="${i.id}" data-systock="${i.stock}" 
                           oninput="updateAuditRow(${i.id}, this.value)"
                           value="0" step="0.01" 
                           style="height: 40px; border-radius: 8px; text-align: center; font-weight: 700; border: 2px solid #e2e8f0;">
                </td>
                <td style="padding: 15px; border: 1px solid #f1f5f9; text-align: center;">
                    <span id="diff_${i.id}" style="font-weight: 800; font-family: monospace; color: ${color};">${diff.toFixed(2)}</span>
                </td>
                <td style="padding: 15px; border: 1px solid #f1f5f9; text-align: center;">
                    <span id="status_${i.id}" style="padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; background: ${bgColor}; color: ${color};">${statusText}</span>
                </td>
                <td style="padding: 15px; border: 1px solid #f1f5f9; text-align: right;">
                    <button class="btn btn-sm" onclick="adjustStoreStock(${i.id})" style="font-weight: 800; color: #1e293b; border: 1px solid #e2e8f0; padding: 6px 15px; border-radius: 8px; background: white;">Adjust</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateAuditRow(id, physical) {
    const sysStock = parseFloat(document.querySelector(`.store-audit-input[data-id="${id}"]`).dataset.systock);
    const phyStock = parseFloat(physical) || 0;
    const diff = phyStock - sysStock;
    
    const diffEl = document.getElementById(`diff_${id}`);
    const statusEl = document.getElementById(`status_${id}`);
    
    diffEl.innerText = (diff > 0 ? '+' : '') + diff.toFixed(2);
    
    if (diff < 0) {
        diffEl.style.color = '#ef4444';
        statusEl.innerText = 'Shortage';
        statusEl.style.background = '#fee2e2';
        statusEl.style.color = '#ef4444';
    } else if (diff > 0) {
        diffEl.style.color = '#059669'; // Darker green
        statusEl.innerText = 'Excess';
        statusEl.style.background = '#d1fae5';
        statusEl.style.color = '#059669';
    } else {
        diffEl.style.color = '#10b981';
        statusEl.innerText = 'Matched';
        statusEl.style.background = '#ecfdf5';
        statusEl.style.color = '#10b981';
    }
}

async function verifyStoreAdmin() {
    const pass = prompt('Enter Admin Password to process stock adjustment:');
    if (!pass) return false;
    
    // Find admin user password
    const adminUser = users.find(u => (u.role === 'Admin' || u.username === 'admin'));
    if (adminUser) {
        if (pass === adminUser.password) return true;
    } else {
        // Fallback for safety during setup
        if (pass === 'admin123' || pass === '1234') return true;
    }
    
    alert('Invalid Password!');
    return false;
}

async function adjustStoreStock(id) {
    const input = document.querySelector(`.store-audit-input[data-id="${id}"]`);
    const val = input.value.trim();
    if (val === '') return alert('Please enter physical stock quantity first.');
    
    const phyVal = parseFloat(val);
    const sysVal = parseFloat(input.dataset.systock);
    const diff = phyVal - sysVal;
    
    if (diff === 0) return alert('No adjustment needed. Stock matches.');
    
    if (await verifyStoreAdmin()) {
        const res = await saveStoreToDB('adjust_store_stock', {
            adjustment: {
                itemId: id,
                targetStock: phyVal,
                diff: diff,
                notes: 'Manual Audit Adjustment'
            }
        });
        if (res) {
            alert('Stock adjusted successfully!');
            refreshData().then(() => refreshStoreAudit());
        }
    }
}

async function adjustAllStoreStock() {
    const inputs = document.querySelectorAll('.store-audit-input');
    const adjustments = [];
    
    inputs.forEach(input => {
        const val = input.value.trim();
        if (val !== '') {
            const phyVal = parseFloat(val);
            const sysVal = parseFloat(input.dataset.systock);
            const diff = phyVal - sysVal;
            if (diff !== 0) {
                adjustments.push({
                    itemId: input.dataset.id,
                    targetStock: phyVal,
                    diff: diff,
                    notes: 'Bulk Audit Adjustment'
                });
            }
        }
    });
    
    if (adjustments.length === 0) return alert('No items ready for adjustment (all physical counts are empty or match system stock).');
    
    if (await verifyStoreAdmin()) {
        const res = await saveStoreToDB('bulk_adjust_store_stock', { adjustments });
        if (res) {
            alert(`Stock adjusted for ${adjustments.length} items successfully!`);
            refreshData().then(() => refreshStoreAudit());
        }
    }
}

async function saveStoreAuditReport() {
    const inputs = document.querySelectorAll('.store-audit-input');
    const records = [];
    let hasData = false;

    inputs.forEach(input => {
        const physical = parseFloat(input.value);
        if (!isNaN(physical)) {
            const system = parseFloat(input.dataset.systock);
            records.push({
                itemId: input.dataset.id,
                systemQty: system,
                godownQty: physical,
                diffQty: physical - system
            });
            hasData = true;
        }
    });

    if (!hasData) return alert('Please enter at least one physical count!');

    const payload = {
        title: 'Store Physical Audit - ' + formatDate(new Date().toISOString()),
        report_type: 'STORE',
        data: records
    };

    try {
        const res = await saveStoreToDB('archive_report', payload);
        if (res) {
            alert('Audit report saved to archives successfully!');
            refreshStoreAudit();
            refreshStoreReports();
        }
    } catch (e) {
        console.error('Audit save error:', e);
    }
}

function refreshStoreReports() {
    const container = document.getElementById('storeReportsList');
    if (!container) return;
    
    const reports = archivedReports.filter(r => r.report_type === 'STORE');
    if (reports.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-400);">No archived reports yet.</div>';
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Report Title</th>
                    <th style="text-align: center;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    reports.forEach(r => {
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px;">${formatDate(r.date)}</td>
                <td style="padding: 12px; font-weight: 600; color: #1e293b;">${r.title}</td>
                <td style="padding: 12px; text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <button class="btn btn-sm btn-primary" onclick="viewStoreArchivedReport(${r.id})" style="border-radius: 6px; padding: 5px 12px; font-weight: 700;">👁️ View</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="printStoreArchivedReport(${r.id})" style="border-radius: 6px; padding: 5px 12px;">🖨️ Print</button>
                        <button class="btn btn-sm btn-light" onclick="deleteArchivedReport(${r.id}, 'STORE')" style="border-radius: 6px; color: #ef4444;">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function deleteArchivedReport(id, type) {
    if (!confirm('Are you sure you want to delete this report?')) return;
    const res = await saveStoreToDB('delete_archived_report', { id: id });
    if (res) {
        archivedReports = archivedReports.filter(r => r.id != id);
        if (type === 'STORE') refreshStoreReports();
        else refreshReports();
    }
}

async function viewStoreArchivedReport(id) {
    const report = archivedReports.find(r => r.id == id);
    if (!report) return;

    let reportData = [];
    try {
        const response = await fetch(`api/sync.php?action=get_archived_report&id=${id}`);
        const result = await response.json();
        if (result.status === 'success' && result.report) {
            reportData = JSON.parse(result.report.data);
        }
    } catch (e) {
        alert('Could not load report data.');
        return;
    }

    let rowsHtml = '';
    reportData.forEach(r => {
        const item = storeItems.find(i => i.id == r.itemId);
        rowsHtml += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px;">${item ? item.code : 'N/A'}</td>
                <td style="padding: 10px; font-weight: 600;">${item ? item.name : 'Unknown'}</td>
                <td style="padding: 10px; text-align: center;">${r.systemQty}</td>
                <td style="padding: 10px; text-align: center;">${r.godownQty}</td>
                <td style="padding: 10px; text-align: center; font-weight: 800; color: ${r.diffQty < 0 ? '#ef4444' : (r.diffQty > 0 ? '#10b981' : '#64748b')}">
                    ${r.diffQty > 0 ? '+' : ''}${r.diffQty}
                </td>
            </tr>
        `;
    });

    const bodyHtml = `
        <div style="padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0ea5e9; margin-bottom: 5px;">${report.title}</h1>
                <p style="color: #64748b;">Generated on: ${formatDate(report.date)} | Store Audit Archive</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f8fafc;">
                    <tr>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Code</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Item Name</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">System</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Physical</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Difference</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('reportViewerTitle').innerText = report.title;
    document.getElementById('archivedReportContent').innerHTML = bodyHtml;
    document.getElementById('reportViewerModal').style.display = 'block';
}

function closeReportViewer() {
    document.getElementById('reportViewerModal').style.display = 'none';
}

async function printStoreArchivedReport(id) {
    await viewStoreArchivedReport(id);
    setTimeout(printArchivedReport, 500);
}

function printArchivedReport() {
    const content = document.getElementById('archivedReportContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Print Report</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                    th { background: #f8fafc; font-weight: 800; text-transform: uppercase; font-size: 12px; }
                    .no-print { display: none !important; }
                    @media print { .no-print { display: none !important; } }
                </style>
            </head>
            <body>
                ${content}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

function exportStoreReportsToExcel() {
    const storeReports = archivedReports.filter(r => r.report_type === 'STORE');
    const blob = new Blob([JSON.stringify(storeReports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Store_Audit_Reports.json';
    a.click();
}

async function printStoreLatestReport() {
    const storeReports = archivedReports.filter(r => r.report_type === 'STORE');
    if (storeReports.length === 0) return alert('No reports found');
    
    const latest = storeReports[0];
    await printStoreArchivedReport(latest.id);
}

// Add event listener for live search
document.addEventListener('input', (e) => {
    if (e.target.id === 'storeItemsSearch') refreshStoreItems();
});


async function revertTransaction(id) {
    if (!confirm('Are you sure you want to remove this record AND revert the stock impact?')) return;
    try {
        const response = await fetch('api/sync.php?action=revert_transaction', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert('✅ Record removed and stock reverted successfully!');
            initApp();
        } else {
            alert('❌ Error: ' + (result.message || 'Unknown error occurred.'));
        }
    } catch (e) {
        console.error('Failed to revert:', e);
        alert('❌ Network error. Check your connection.');
    }
}

async function revertRMTransaction(id) {
    if (!confirm('Are you sure you want to remove this record AND revert the RM stock impact?')) return;
    try {
        const response = await fetch('api/sync.php?action=revert_rm_transaction', {
            method: 'POST',
            body: JSON.stringify({ id })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert('✅ RM Record removed and stock reverted successfully!');
            initApp();
        } else {
            alert('❌ Error: ' + (result.message || 'Unknown error occurred.'));
        }
    } catch (e) {
        console.error('Failed to revert RM:', e);
        alert('❌ Network error. Check your connection.');
    }
}

function switchSettingsTab(tabId, btn) {
    document.querySelectorAll('.settings-section').forEach(s => s.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
}


// ==================== USER PERMISSIONS SYSTEM ====================

const systemModules = [
    { id: "fg_dashboard", name: "Finish Goods: Dashboard" },
    { id: "fg_production", name: "Finish Goods: Production Entry" },
    { id: "fg_orders", name: "Finish Goods: Orders & Invoicing" },
    { id: "fg_inventory", name: "Finish Goods: Inventory Summary (Cats)" },
    { id: "fg_customers", name: "Finish Goods: Customers Database" },
    { id: "fg_stocklist", name: "Finish Goods: Detailed Stock List" },
    { id: "fg_audit", name: "Finish Goods: Monthly Audit" },
    { id: "fg_low_stock", name: "Finish Goods: Low Stock Alert Report" },
    { id: "fg_reports", name: "Finish Goods: Reports Archive" },
    
    { id: "rm_dashboard", name: "Raw Materials: Dashboard" },
    { id: "rm_purchase", name: "Raw Materials: Purchase (IN)" },
    { id: "rm_consumption", name: "Raw Materials: Usage (OUT)" },
    { id: "rm_formula", name: "Raw Materials: Production Formulas" },
    { id: "rm_inventory", name: "Raw Materials: RM Inventory" },
    { id: "rm_balance", name: "Raw Materials: Inventory Balance" },
    { id: "rm_audit", name: "Raw Materials: Monthly Audit" },
    { id: "rm_reports", name: "Raw Materials: Reports" },
    { id: "rm_pr_vs_rm", name: "Raw Materials: PR vs RM Consumption" },
    
    { id: "store_dashboard", name: "Store: Dashboard & Alerts" },
    { id: "store_inward", name: "Store: Inwards" },
    { id: "store_outward", name: "Store: Outwards" },
    { id: "store_inventory", name: "Store: Inventory" },
    { id: "store_items", name: "Store: Item Records" },
    { id: "store_audit", name: "Store: Monthly Audit" },
    { id: "store_reports", name: "Store: Reports" },
    
    { id: "settings", name: "System Settings & Database" }
];

function renderPermissionsTable() {
    const tbody = document.getElementById("permissionsTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = systemModules.map(m => `
        <tr style="border-bottom: 1px solid var(--gray-100);">
            <td style="padding: 10px; font-size: 0.85rem; font-weight: 600; color: var(--gray-700);">${m.name}</td>
            <td style="padding: 10px; text-align: center;">
                <input type="checkbox" class="perm-check perm-view" data-module="${m.id}" onchange="syncEditorCheck(this)">
            </td>
            <td style="padding: 10px; text-align: center;">
                <input type="checkbox" class="perm-check perm-edit" data-module="${m.id}" onchange="syncViewerCheck(this)">
            </td>
        </tr>
    `).join("");
}

function syncEditorCheck(el) {
    // If viewer is unchecked, editor must be unchecked
    if (!el.checked) {
        const mod = el.dataset.module;
        document.querySelector(`.perm-edit[data-module="${mod}"]`).checked = false;
    }
}

function syncViewerCheck(el) {
    // If editor is checked, viewer must be checked
    if (el.checked) {
        const mod = el.dataset.module;
        document.querySelector(`.perm-view[data-module="${mod}"]`).checked = true;
    }
}

function handleRoleChange(role) {
    const checks = document.querySelectorAll(".perm-check");
    const tag = document.getElementById("permissionStatusTag");

    if (String(role).toLowerCase() === "admin") {
        checks.forEach(c => {
            c.checked = true;
            c.disabled = true;
        });
        if (tag) {
            tag.innerText = "FULL ACCESS (Admin)";
            tag.style.background = "var(--green-50)";
            tag.style.color = "var(--green-600)";
        }
    } else {
        checks.forEach(c => {
            c.checked = false;
            c.disabled = false;
        });
        if (tag) {
            tag.innerText = "CUSTOM RIGHTS (User)";
            tag.style.background = "var(--sky-50)";
            tag.style.color = "var(--sky-600)";
        }
    }
}

function collectPermissions() {
    const perms = {};
    systemModules.forEach(m => {
        perms[m.id] = {
            view: document.querySelector(`.perm-view[data-module="${m.id}"]`).checked,
            edit: document.querySelector(`.perm-edit[data-module="${m.id}"]`).checked
        };
    });
    return JSON.stringify(perms);
}

function applyPermissionsToUI(permsJson) {
    if (!permsJson) return;
    try {
        const perms = JSON.parse(permsJson);
        systemModules.forEach(m => {
            if (perms[m.id]) {
                document.querySelector(`.perm-view[data-module="${m.id}"]`).checked = perms[m.id].view;
                document.querySelector(`.perm-edit[data-module="${m.id}"]`).checked = perms[m.id].edit;
            }
        });
    } catch(e) { console.error("Error parsing permissions", e); }
}

function checkPermission(module, type = "view") {
    // Admins have absolute power
    if (currentUser && String(currentUser.role).toLowerCase() === 'admin') return true;
    
    // Safely parse permissions
    let perms = {};
    if (currentUser && currentUser.permissions) {
        try {
            perms = typeof currentUser.permissions === 'string' ? JSON.parse(currentUser.permissions) : currentUser.permissions;
        } catch(e) { console.error("Permission parse error", e); }
    }
    
    if (!perms[module]) return false;
    return perms[module][type] === true;
}

function enforceGlobalPermissions() {
    if (!currentUser) return;
    
    // Admin check - case insensitive
    const isAdmin = currentUser && String(currentUser.role).toLowerCase() === 'admin';
    console.log("Applying strict security for:", currentUser.username, `(Admin: ${isAdmin})`);
    
    // 1. Module Accessibility (Sidebar & Content Tabs)
    const navMapping = {
        "fg_dashboard": ".nav-tab[onclick*=\"'dashboard'\"], #dashboard",
        "fg_production": ".nav-tab[onclick*=\"'dataEntry'\"], #dataEntry",
        "fg_orders": ".nav-tab[onclick*=\"'orders'\"], #orders",
        "fg_inventory": ".nav-tab[onclick*=\"'categories'\"], #categories",
        "fg_customers": ".nav-tab[onclick*=\"'customers'\"], #customers",
        "fg_stocklist": ".nav-tab[onclick*=\"'stockList'\"], #stockList",
        "fg_audit": ".nav-tab[onclick*=\"'audit'\"], #audit",
        "fg_low_stock": ".nav-tab[onclick*=\"'lowStockReport'\"], #lowStockReport",
        "fg_reports": ".nav-tab[onclick*=\"'reports'\"], #reports",
        
        "rm_dashboard": ".nav-tab[onclick*=\"'rm_dashboard'\"], #rm_dashboard",
        "rm_purchase": ".nav-tab[onclick*=\"'rm_in'\"], #rm_in",
        "rm_consumption": ".nav-tab[onclick*=\"'rm_out'\"], #rm_out",
        "rm_formula": ".nav-tab[onclick*=\"'rm_formulas'\"], #rm_formulas",
        "rm_inventory": ".nav-tab[onclick*=\"'rm_inventory'\"], #rm_inventory",
        "rm_balance": ".nav-tab[onclick*=\"'rm_balance'\"], #rm_balance",
        "rm_audit": ".nav-tab[onclick*=\"'rm_audit'\"], #rm_audit",
        "rm_reports": ".nav-tab[onclick*=\"'rm_reports'\"], #rm_reports",
        "rm_pr_vs_rm": ".nav-tab[onclick*=\"'rm_consumption'\"], #rm_consumption",
        
        "store_dashboard": ".nav-tab[onclick*=\"'store_dashboard'\"], #store_dashboard",
        "store_inward": ".nav-tab[onclick*=\"'store_inwards'\"], #store_inwards",
        "store_outward": ".nav-tab[onclick*=\"'store_outwards'\"], #store_outwards",
        "store_inventory": ".nav-tab[onclick*=\"'store_inventory'\"], #store_inventory",
        "store_items": ".nav-tab[onclick*=\"'store_items'\"], #store_items",
        "store_audit": ".nav-tab[onclick*=\"'store_audit'\"], #store_audit",
        "store_reports": ".nav-tab[onclick*=\"'store_reports'\"], #store_reports",
        "settings": ".menu-item:nth-child(4), .sidebar-btn[onclick*=\"'settings'\"], #settingsPanel"
    };

    // Main Module Buttons (Finish Good, RM, Store, Settings)
    const moduleMap = {
        "fg": { ids: ["fg_dashboard", "fg_production", "fg_orders", "fg_inventory", "fg_customers", "fg_stocklist", "fg_audit", "fg_low_stock", "fg_reports"], selector: ".menu-item:nth-child(1)" },
        "rm": { ids: ["rm_dashboard", "rm_purchase", "rm_formula", "rm_consumption", "rm_inventory", "rm_balance", "rm_audit", "rm_reports", "rm_pr_vs_rm"], selector: ".menu-item:nth-child(2)" },
        "st": { ids: ["store_dashboard", "store_inward", "store_outward", "store_inventory", "store_items", "store_audit", "store_reports"], selector: ".menu-item:nth-child(3)" },
        "se": { ids: ["settings"], selector: ".menu-item:nth-child(4)" }
    };

    // First, check top-level module visibility
    Object.keys(moduleMap).forEach(key => {
        const m = moduleMap[key];
        const anyAccess = isAdmin || m.ids.some(id => checkPermission(id, "view"));
        const btn = document.querySelector(m.selector);
        if (btn) {
            if (anyAccess) {
                btn.style.opacity = "1";
                btn.style.filter = "none";
                btn.style.pointerEvents = "auto";
                btn.style.display = "flex";
            } else {
                btn.style.opacity = "0.4";
                btn.style.filter = "blur(12px) grayscale(1)";
                btn.style.pointerEvents = "none";
                if (key === 'se') btn.style.display = "none";
            }
        }
    });

    // Handle internal tabs and content areas
    systemModules.forEach(m => {
        const hasView = isAdmin || checkPermission(m.id, "view");
        const selector = navMapping[m.id];
        if (selector) {
            document.querySelectorAll(selector).forEach(el => {
                if (hasView) {
                    el.style.opacity = "1";
                    el.style.filter = "none";
                    el.style.pointerEvents = "auto";
                } else {
                    el.style.opacity = "0.4";
                    el.style.filter = "blur(12px) grayscale(1)";
                    el.style.pointerEvents = "none";
                }
            });
        }
    });

    // 2. Editor Actions (Action Buttons)
    const curMod = determineCurrentModule();
    if (curMod) {
        const canEdit = isAdmin || checkPermission(curMod, "edit");
        
        // Scan all buttons, action links, and interactive icons
        const editorElements = document.querySelectorAll("button, .btn, .btn-sm, .text-error, a.action-link, i[onclick], span[onclick]");
        
        editorElements.forEach(btn => {
            const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
            const text = (btn.innerText || '').toLowerCase();
            const id = (btn.id || '').toLowerCase();
            const className = (btn.className || '').toLowerCase();
            
            // List of keywords that indicate an EDIT/SAVE/DELETE action
            const editKeywords = ['save', 'add', 'delete', 'edit', 'remove', 'update', 'revert', 'sync', 'create', 'insert', 'modify', 'clear', 'resequence', 'trash'];
            const isEditAction = editKeywords.some(k => onclick.includes(k) || text.includes(k) || id.includes(k) || className.includes(k));
            
            if (isEditAction) {
                // Special exemption: allow closing modals, generic UI toggles, or VIEWING actions
                const safeKeywords = ['close', 'toggle', 'print', 'view', 'show', 'cancel', 'back', 'dismiss'];
                const isSafe = safeKeywords.some(k => onclick.includes(k) || text.includes(k));
                
                if (isSafe && !onclick.includes('save') && !onclick.includes('delete')) return; 
                
                if (canEdit) {
                    btn.style.display = "";
                    btn.style.visibility = "visible";
                    btn.style.pointerEvents = "auto";
                } else {
                    btn.style.display = "none";
                    btn.style.pointerEvents = "none";
                }
            }
        });

        // 3. Inputs & Forms (Read-Only Enforcement)
        if (!canEdit) {
            const inputs = document.querySelectorAll("input, select, textarea");
            inputs.forEach(input => {
                const id = (input.id || '').toLowerCase();
                const placeholder = (input.placeholder || '').toLowerCase();
                const type = (input.type || '').toLowerCase();
                
                // Keep search bars and filters active for navigation
                if (id.includes('search') || placeholder.includes('search') || id.includes('filter') || type === 'search') return;
                
                input.disabled = true;
                input.style.opacity = "0.7";
                input.style.cursor = "not-allowed";
            });
        } else {
            // Re-enable if they might have been disabled previously
            const inputs = document.querySelectorAll("input, select, textarea");
            inputs.forEach(input => {
                if (input.disabled && !input.classList.contains('always-disabled')) {
                    input.disabled = false;
                    input.style.opacity = "1";
                    input.style.cursor = "auto";
                }
            });
        }
    }
}

function determineCurrentModule() {
    // Finish Good Panels
    if (document.getElementById('finishGoodPanel') && document.getElementById('finishGoodPanel').style.display !== 'none') {
        const activeTab = document.querySelector('#finishGoodPanel .tab-content.active');
        if (activeTab) {
            const id = activeTab.id;
            if (id === 'dashboard') return 'fg_dashboard';
            if (id === 'dataEntry') return 'fg_production';
            if (id === 'orders') return 'fg_orders';
            if (id === 'categories') return 'fg_inventory';
            if (id === 'customers') return 'fg_customers';
            if (id === 'stockList') return 'fg_stocklist';
            if (id === 'audit') return 'fg_audit';
            if (id === 'lowStockReport') return 'fg_low_stock';
            if (id === 'reports') return 'fg_reports';
        }
    }
    // RM Panels
    if (document.getElementById('rawMaterialsPanel') && document.getElementById('rawMaterialsPanel').style.display !== 'none') {
        const activeTab = document.querySelector('#rawMaterialsPanel .tab-content.active');
        if (activeTab) {
            const id = activeTab.id;
            if (id === 'rm_dashboard') return 'rm_dashboard';
            if (id === 'rm_in') return 'rm_purchase';
            if (id === 'rm_formulas') return 'rm_formula';
            if (id === 'rm_out') return 'rm_consumption';
            if (id === 'rm_inventory') return 'rm_inventory';
            if (id === 'rm_balance') return 'rm_balance';
            if (id === 'rm_audit') return 'rm_audit';
            if (id === 'rm_reports') return 'rm_reports';
            if (id === 'rm_consumption') return 'rm_pr_vs_rm';
        }
    }
    // Store Panels
    if (document.getElementById('storePanel') && document.getElementById('storePanel').style.display !== 'none') {
        const activeTab = document.querySelector('#storePanel .tab-content.active');
        if (activeTab) {
            const id = activeTab.id;
            if (id === 'store_dashboard') return 'store_dashboard';
            if (id === 'store_inwards') return 'store_inward';
            if (id === 'store_outwards') return 'store_outward';
            if (id === 'store_inventory') return 'store_inventory';
            if (id === 'store_items') return 'store_items';
            if (id === 'store_audit') return 'store_audit';
            if (id === 'store_reports') return 'store_reports';
        }
    }
    // Settings
    if (document.getElementById('settingsPanel') && document.getElementById('settingsPanel').style.display !== 'none') {
        return 'settings';
    }
    return null;
}

// ==================== NEW USER RIGHTS LOGIC ====================

let currentlyEditingRightsId = null;

function handleUserRightsSelect(userId) {
    if (!userId) {
        document.getElementById('rightsMatrixContent').style.display = 'none';
        document.getElementById('noUserSelectedState').style.display = 'block';
        currentlyEditingRightsId = null;
        return;
    }
    
    const user = users.find(u => u.id == userId);
    if (!user) return;
    
    currentlyEditingRightsId = userId;
    document.getElementById('noUserSelectedState').style.display = 'none';
    document.getElementById('rightsMatrixContent').style.display = 'block';
    
    // Set admin status in the interface
    const isAdmin = String(user.role).toLowerCase() === 'admin';
    document.getElementById('makeAdminBtn').innerText = isAdmin ? 'Revoke Admin Status' : 'Promote to Admin';
    document.getElementById('makeAdminBtn').style.background = isAdmin ? 'var(--orange-50)' : 'var(--gray-50)';
    document.getElementById('makeAdminBtn').style.color = isAdmin ? 'var(--orange-600)' : 'var(--gray-600)';

    renderPermissionsTable(); // Ensure it's clean
    handleRoleChange(user.role || 'user');
    if (!isAdmin) {
        applyPermissionsToUI(user.permissions);
    }
}

async function savePermissionsForSelectedUser() {
    if (!currentlyEditingRightsId) return alert('No user selected!');
    
    const user = users.find(u => u.id == currentlyEditingRightsId);
    if (!user) return;

    const role = user.role; // Keep current role (Admin or User)
    const permissions = collectPermissions();

    try {
        const response = await fetch('api/sync.php?action=save_user', {
            method: 'POST',
            body: JSON.stringify({ 
                user: { 
                    id: user.id, 
                    name: user.name, 
                    username: user.username, 
                    password: user.password, 
                    role: user.role, 
                    permissions: permissions 
                } 
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert(`Rights updated for ${user.name} successfully!`);
            initApp(); // Refresh local data
        } else {
            alert('Error: ' + result.message);
        }
    } catch (e) {
        alert('Could not save rights. Check server connection.');
    }
}

async function toggleAdminRoleForSelectedUser() {
    if (!currentlyEditingRightsId) return;
    const user = users.find(u => u.id == currentlyEditingRightsId);
    if (!user) return;
    
    const isAdm = String(user.role).toLowerCase() === 'admin';
    const newRole = isAdm ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to ${newRole === 'admin' ? 'Promote' : 'Demote'} ${user.name}?`)) return;

    try {
        const response = await fetch('api/sync.php?action=save_user', {
            method: 'POST',
            body: JSON.stringify({ 
                user: { 
                    ...user,
                    role: newRole
                } 
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            alert(`${user.name} is now a ${newRole.toUpperCase()}.`);
            initApp().then(() => handleUserRightsSelect(currentlyEditingRightsId));
        }
    } catch (e) { alert('Failed to change role.'); }
}

