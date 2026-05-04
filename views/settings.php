<div class="settings-container" style="height: 100%; display: flex; flex-direction: column; gap: 1.5rem;">
    <!-- Settings Header Navigation -->
    <div class="settings-nav-header no-print" style="background: var(--sky-500); padding: 0.4rem; border-radius: 50px; display: flex; gap: 5px; box-shadow: var(--shadow-sm); width: max-content; align-self: center;">
        <button class="settings-tab active" onclick="switchSettingsTab('companyTab', this)">Company Profile</button>
        <button class="settings-tab" onclick="switchSettingsTab('systemTab', this)">System Preferences</button>
        <button class="settings-tab" onclick="switchSettingsTab('usersTab', this)">User Accounts</button>
        <button class="settings-tab" onclick="switchSettingsTab('rightsTab', this)">User Access Rights</button>
        <button class="settings-tab" onclick="switchSettingsTab('dataTab', this)">Database & Backup</button>
    </div>

    <!-- Settings Content Area -->
    <div class="settings-content" style="flex: 1; background: white; border-radius: 24px; padding: 2.5rem; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); overflow-y: auto;">
        
        <!-- Tab 1: Company Profile -->
        <div id="companyTab" class="settings-section">
            <h2 style="color: var(--sky-600); font-weight: 800; margin-bottom: 2.5rem; border-bottom: 2px solid var(--gray-100); padding-bottom: 0.5rem; display: inline-block;">Business Profile</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 4rem;">
                <div>
                    <div class="form-group" style="margin-bottom: 2rem;">
                        <label style="font-weight: 700; color: var(--gray-600); font-size: 0.9rem; margin-bottom: 0.8rem; display: block;">OFFICIAL BUSINESS NAME</label>
                        <input type="text" id="companyNameInput" class="form-control" style="border-radius: 12px; padding: 1.2rem; border: 2px solid var(--gray-200); font-size: 1.1rem; font-weight: 600;" placeholder="Enter Company Name">
                    </div>
                    <button class="btn" onclick="saveCompanySettings()" style="background: var(--sky-600); color: white; padding: 1.2rem 2.5rem; border-radius: 12px; font-weight: 800; width: 100%; transition: all 0.3s ease;">
                        💾 Update Business Profile
                    </button>
                </div>
                <div style="text-align: center; background: var(--gray-50); padding: 2rem; border-radius: 24px; border: 1px solid var(--gray-200);">
                    <label style="font-weight: 800; color: var(--gray-600); display: block; margin-bottom: 1.5rem; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px;">Company Logo</label>
                    <div class="logo-preview" id="logoPreview" onclick="document.getElementById('logoFile').click()" style="width: 180px; height: 180px; background: white; border: 3px dashed var(--sky-200); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; cursor: pointer; overflow: hidden; box-shadow: var(--shadow-sm); transition: all 0.3s ease;">
                        <span style="font-size: 3rem; color: var(--sky-200);">LOGO</span>
                    </div>
                    <input type="file" id="logoFile" accept="image/*" style="display:none;" onchange="handleLogoUpload(event)">
                    <button class="btn" onclick="document.getElementById('logoFile').click()" style="background: white; border: 1px solid var(--gray-300); color: var(--gray-600); font-size: 0.85rem; border-radius: 8px; padding: 0.5rem 1rem; font-weight: 600;">
                        Change Logo
                    </button>
                </div>
            </div>
        </div>

        <!-- Tab 2: System Preferences -->
        <div id="systemTab" class="settings-section" style="display: none;">
            <h2 style="color: var(--sky-600); font-weight: 800; margin-bottom: 2.5rem; border-bottom: 2px solid var(--gray-100); padding-bottom: 0.5rem; display: inline-block;">System Preferences</h2>
            <div style="max-width: 600px;">
                <div class="form-group" style="margin-bottom: 3rem;">
                    <label style="font-weight: 800; color: var(--gray-600); margin-bottom: 1rem; display: block; font-size: 0.9rem;">DATE DISPLAY FORMAT</label>
                    <select id="systemDateFormat" class="form-control" style="border-radius: 15px; padding: 1.2rem; border: 2px solid var(--gray-200); font-size: 1rem; font-weight: 600; background: white;" onchange="updateDateFormat()">
                        <option value="DD-MMM-YYYY">11-Apr-2026 (DD-MMM-YYYY)</option>
                        <option value="DD-MM-YYYY">11-04-2026 (DD-MM-YYYY)</option>
                        <option value="DD/MM/YYYY">11/04/2026 (DD/MM/YYYY)</option>
                        <option value="YYYY-MM-DD">2026-04-11 (YYYY-MM-DD)</option>
                    </select>
                    <div style="display: flex; gap: 0.8rem; align-items: center; margin-top: 1rem; background: var(--sky-50); padding: 0.8rem 1.2rem; border-radius: 10px; border: 1px solid var(--sky-100);">
                        <i class="fas fa-info-circle" style="color: var(--sky-500);"></i>
                        <p style="color: var(--sky-700); font-size: 0.85rem; margin: 0; font-weight: 500;">This preference will be applied across all modules, reports, and printouts.</p>
                    </div>
                </div>

                <div class="form-group">
                    <label style="font-weight: 800; color: var(--gray-600); margin-bottom: 1.5rem; display: block; font-size: 0.9rem;">BRAND ALERT THRESHOLDS (Stock Limits)</label>
                    <div id="brandLowStockSettings" style="background: var(--gray-50); border-radius: 20px; padding: 2rem; border: 1px solid var(--gray-200); min-height: 100px;">
                        <!-- JS Dynamic content -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Tab 3: User Management -->
        <div id="usersTab" class="settings-section" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; border-bottom: 2px solid var(--gray-100); padding-bottom: 0.5rem;">
                <h2 style="color: var(--sky-600); font-weight: 800; margin: 0;">User Management</h2>
                <button class="btn" onclick="showAddUserModal()" style="background: var(--green-600); color: white; border-radius: 12px; font-weight: 700; padding: 0.8rem 1.5rem;">
                    ➕ Create New User Account
                </button>
            </div>
            <div style="background: white; border-radius: 20px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm); overflow: hidden;">
                <table class="data-table" style="margin: 0; width: 100%;">
                    <thead style="background: var(--gray-50);">
                        <tr>
                            <th style="padding: 1.2rem; color: var(--gray-500); font-weight: 800; text-transform: uppercase; font-size: 0.8rem;">Full Name</th>
                            <th style="padding: 1.2rem; color: var(--gray-500); font-weight: 800; text-transform: uppercase; font-size: 0.8rem;">Username</th>
                            <th style="padding: 1.2rem; color: var(--gray-500); font-weight: 800; text-transform: uppercase; font-size: 0.8rem;">Access Level</th>
                            <th style="padding: 1.2rem; color: var(--gray-500); font-weight: 800; text-transform: uppercase; font-size: 0.8rem; text-align: right;">Control</th>
                        </tr>
                    </thead>
                    <tbody id="usersList"></tbody>
                </table>
            </div>
        </div>

        <!-- Tab 4: User Access Rights -->
        <div id="rightsTab" class="settings-section" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; border-bottom: 2px solid var(--gray-100); padding-bottom: 1rem;">
                <div>
                    <h2 style="color: var(--sky-600); font-weight: 800; margin: 0;">Access Control Matrix</h2>
                    <p style="color: var(--gray-500); font-size: 0.85rem; margin-top: 0.5rem;">Select a user to configure their specific viewing and editing rights.</p>
                </div>
                <div style="width: 300px;">
                    <label style="font-weight: 800; font-size: 0.75rem; color: var(--gray-400); text-transform: uppercase; margin-bottom: 5px; display: block;">Select Staff User</label>
                    <select id="userRightsSelector" class="form-control" onchange="handleUserRightsSelect(this.value)" style="border: 2px solid var(--sky-200); border-radius: 12px; font-weight: 700; height: 50px;">
                        <option value="">-- Choose a user --</option>
                    </select>
                </div>
            </div>

            <div id="rightsMatrixContent" style="display: none;">
                <div style="background: var(--gray-50); padding: 12px; border-radius: 12px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <span id="permissionStatusTag" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 50px; font-weight: 700;">USER RIGHTS CONFIG</span>
                    </div>
                    <button id="makeAdminBtn" class="btn btn-sm" onclick="toggleAdminRoleForSelectedUser()" style="border-radius: 8px; font-size: 0.75rem; font-weight: 700;">Promote to Admin</button>
                </div>

                <div class="table-responsive" style="max-height: 500px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: 12px;">
                    <table class="data-table" style="margin: 0; font-size: 0.75rem;">
                        <thead style="position: sticky; top: 0; z-index: 10;">
                            <tr>
                                <th style="background: var(--gray-100); width: 60%;">Module / Menu</th>
                                <th style="background: var(--gray-100); text-align: center;">Viewer</th>
                                <th style="background: var(--gray-100); text-align: center;">Editor</th>
                            </tr>
                        </thead>
                        <tbody id="permissionsTableBody">
                            <!-- Dynamic UI -->
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem;">
                    <button class="btn" onclick="savePermissionsForSelectedUser()" style="background: var(--sky-600); color: white; padding: 1.2rem 3rem; border-radius: 15px; font-weight: 800; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3);">
                        💾 Save All Permissions
                    </button>
                    <button class="btn" onclick="toggleAdminRoleForSelectedUser()" id="makeAdminBtn" style="background: var(--gray-100); color: var(--gray-600); border: 1.5px solid var(--gray-200); border-radius: 15px; font-weight: 700; padding: 1.2rem 2rem;">
                        Promote to Admin
                    </button>
                </div>
            </div>
            
            <div id="noUserSelectedState" style="text-align: center; padding: 5rem 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.3;">👤</div>
                <h3 style="color: var(--gray-400); font-weight: 700;">Please select a user from the dropdown above to manage their access.</h3>
            </div>

            </div>
        </div>

        <!-- Tab 5: Database & Backup -->
        <div id="dataTab" class="settings-section" style="display: none;">
            <h2 style="color: var(--sky-600); font-weight: 800; margin-bottom: 2.5rem; border-bottom: 2px solid var(--gray-100); padding-bottom: 0.5rem; display: inline-block;">Database & Safety</h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                <!-- Full SQL Backup -->
                <div style="background: white; border: 1.5px solid var(--sky-100); border-radius: 24px; padding: 2.5rem 2rem; text-align: center; transition: all 0.3s ease;">
                    <h3 style="margin-bottom: 0.8rem; color: var(--gray-800); font-weight: 800;">Global System Backup</h3>
                    <p style="font-size: 0.85rem; color: var(--gray-500); margin-bottom: 2rem; line-height: 1.5;">Create a complete snapshot of your entire database including all stocks, formulas, and history.</p>
                    <button class="btn" onclick="window.location.href='api/backup.php'" style="background: var(--sky-600); color: white; width: 100%; border-radius: 12px; font-weight: 800; padding: 1rem;">Download SQL Backup</button>
                </div>

                <!-- Database Restore -->
                <div style="background: white; border: 1.5px solid #fecdd3; border-radius: 24px; padding: 2.5rem 2rem; text-align: center; transition: all 0.3s ease;">
                    <h3 style="margin-bottom: 0.8rem; color: var(--gray-800); font-weight: 800;">Restore Data</h3>
                    <p style="font-size: 0.85rem; color: var(--gray-500); margin-bottom: 2rem; line-height: 1.5;">Roll back your entire system to a previous state by uploading a backup file (.sql).</p>
                    <button class="btn" onclick="document.getElementById('restoreFile').click()" style="background: #e11d48; color: white; width: 100%; border-radius: 12px; font-weight: 800; padding: 1rem;">Restore System Data</button>
                    <input type="file" id="restoreFile" accept=".sql" style="display:none;" onchange="handleRestore(event)">
                </div>

                <!-- CSV Data Exchange -->
                <div style="background: white; border: 1.5px solid #bbf7d0; border-radius: 24px; padding: 2.5rem 2rem; text-align: center;">
                    <h3 style="margin-bottom: 0.8rem; color: var(--gray-800); font-weight: 800;">CSV Data Exchange</h3>
                    <p style="font-size: 0.85rem; color: var(--gray-500); margin-bottom: 1.5rem;">Bulk import or export master data lists.</p>
                    <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn" onclick="exportData('items')" style="flex: 1; background: #f0fdf4; color: #16a34a; border: 1.5px solid #16a34a; border-radius: 10px; font-weight: 700; font-size: 0.8rem;">Export Items</button>
                            <button class="btn" onclick="document.getElementById('importItemsFile').click()" style="flex: 1; background: #fefce8; color: #854d0e; border: 1.5px solid #eab308; border-radius: 10px; font-weight: 700; font-size: 0.8rem;">Import Items</button>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn" onclick="exportData('customers')" style="flex: 1; background: #f0fdf4; color: #16a34a; border: 1.5px solid #16a34a; border-radius: 10px; font-weight: 700; font-size: 0.8rem;">Export Customers</button>
                            <button class="btn" onclick="document.getElementById('importCustomersFile').click()" style="flex: 1; background: #fefce8; color: #854d0e; border: 1.5px solid #eab308; border-radius: 10px; font-weight: 700; font-size: 0.8rem;">Import Customers</button>
                        </div>
                    </div>
                    <input type="file" id="importItemsFile" accept=".csv" style="display:none;" onchange="importData('items', event)">
                    <input type="file" id="importCustomersFile" accept=".csv" style="display:none;" onchange="importData('customers', event)">
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.settings-tab {
    padding: 0.6rem 1.5rem;
    border: none;
    background: transparent;
    border-radius: 50px;
    text-align: center;
    font-weight: 700;
    color: white;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.85rem;
    white-space: nowrap;
}
.settings-tab:hover {
    background: rgba(255, 255, 255, 0.15);
}
.settings-tab.active {
    background: white;
    color: var(--sky-600);
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.logo-preview:hover {
    border-color: var(--sky-500) !important;
    transform: scale(1.02);
}
#logoPreview img {
    box-shadow: var(--shadow-md);
}
</style>