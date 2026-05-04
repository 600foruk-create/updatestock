<div class="store-outwards" style="padding: 1rem;">
    <!-- OUTWARD FORM -->
    <style>
        .store-form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            background: white;
            padding: 2.5rem;
            border-radius: 20px;
            border: 1px solid var(--gray-200);
            box-shadow: var(--shadow-sm);
            margin-bottom: 2rem;
        }
        .store-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
            position: relative;
        }
        .store-field label {
            font-weight: 700;
            color: #9b2c2c;
            font-size: 0.85rem;
            margin: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .store-input-group {
            position: relative;
            display: flex;
            align-items: center;
        }
        .store-control {
            height: 48px !important;
            border-radius: 12px !important;
            border: 2px solid #f1f5f9 !important;
            padding: 0 15px !important;
            font-size: 0.95rem !important;
            width: 100% !important;
            transition: all 0.2s ease;
            background: #fdfdfd !important;
        }
        .store-control:focus {
            border-color: #f87171 !important;
            background: white !important;
            box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.1) !important;
            outline: none;
        }
        /* Custom Dropdown Styling */
        .smart-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            z-index: 1000;
            margin-top: 5px;
            max-height: 250px;
            overflow-y: auto;
            display: none;
            padding: 8px;
        }
        .dropdown-item-custom {
            padding: 10px 12px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
            color: #475569;
            transition: all 0.15s ease;
        }
        .dropdown-item-custom:hover {
            background: #fff5f5;
            color: #9b2c2c;
        }
        .dropdown-item-custom .delete-btn {
            color: #ef4444;
            padding: 5px 8px;
            border-radius: 6px;
            transition: all 0.2s;
            opacity: 0.6;
        }
        .dropdown-item-custom:hover .delete-btn {
            opacity: 1;
            background: #fee2e2;
        }
        .add-new-indicator {
            padding: 12px;
            font-size: 0.85rem;
            color: white;
            font-weight: 700;
            background: #ef4444;
            cursor: pointer;
            margin-top: 5px;
            border-radius: 12px;
            text-align: center;
            display: none;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        /* Select2 override to match heights */
        .select2-container--default .select2-selection--single {
            height: 48px !important;
            border: 2px solid #f1f5f9 !important;
            border-radius: 12px !important;
            display: flex !important;
            align-items: center !important;
        }
        .select2-container--default .select2-selection--single .select2-selection__rendered {
            padding-left: 15px !important;
        }
    </style>

    <div class="store-form-grid">
        <div class="store-field">
            <label>Select Item</label>
            <select id="storeOutwardItemSelect" class="form-control select2">
                <!-- Populated by JS -->
            </select>
        </div>
        
        <div class="store-field">
            <label>Quantity</label>
            <input type="number" id="storeOutwardQty" class="store-control" min="1" step="0.01" placeholder="0.00">
        </div>

        <div class="store-field">
            <label>
                Issued To (Person/Dept)
                <button type="button" onclick="addNewFromInput('issued_to')" style="border:none; background:#ecfdf5; color:#059669; font-size:0.75rem; padding:2px 8px; border-radius:6px; font-weight:800; cursor:pointer;">+ Add New</button>
            </label>
            <div class="store-input-group">
                <input type="text" id="storeIssuedTo" class="store-control smart-input" data-type="issued_to" autocomplete="off" placeholder="Select or type to add...">
                <div class="smart-dropdown" id="dropdown_issued_to"></div>
            </div>
            <div class="add-new-indicator" id="add_indicator_issued_to" onclick="addNewFromInput('issued_to')">+ Add "${document.getElementById('storeIssuedTo')?.value}" to List</div>
        </div>

        <div class="store-field">
            <label>
                Issued By (Staff)
                <button type="button" onclick="addNewFromInput('issued_by')" style="border:none; background:#ecfdf5; color:#059669; font-size:0.75rem; padding:2px 8px; border-radius:6px; font-weight:800; cursor:pointer;">+ Add New</button>
            </label>
            <div class="store-input-group">
                <input type="text" id="storeIssuedBy" class="store-control smart-input" data-type="issued_by" autocomplete="off" placeholder="Select or type to add...">
                <div class="smart-dropdown" id="dropdown_issued_by"></div>
            </div>
            <div class="add-new-indicator" id="add_indicator_issued_by" onclick="addNewFromInput('issued_by')">+ Add "${document.getElementById('storeIssuedBy')?.value}" to List</div>
        </div>

        <div class="store-field">
            <label>
                Purpose / Reason
                <button type="button" onclick="addNewFromInput('purpose')" style="border:none; background:#ecfdf5; color:#059669; font-size:0.75rem; padding:2px 8px; border-radius:6px; font-weight:800; cursor:pointer;">+ Add New</button>
            </label>
            <div class="store-input-group">
                <input type="text" id="storePurpose" class="store-control smart-input" data-type="purpose" autocomplete="off" placeholder="Select or type to add...">
                <div class="smart-dropdown" id="dropdown_purpose"></div>
            </div>
            <div class="add-new-indicator" id="add_indicator_purpose" onclick="addNewFromInput('purpose')">+ Add "${document.getElementById('storePurpose')?.value}" to List</div>
        </div>

        <div class="store-field">
            <label>Remarks / Notes</label>
            <input type="text" id="storeIssueNotes" class="store-control" placeholder="Optional notes...">
        </div>
        
        <div style="grid-column: span 2; display: flex; justify-content: flex-end; margin-top: 1rem; border-top: 1px solid #f1f5f9; padding-top: 2rem;">
            <button class="btn btn-danger btn-lg" onclick="saveStoreOutward()" style="padding: 0.8rem 5rem; font-weight: 800; border-radius: 12px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3); letter-spacing: 0.5px; transition: all 0.3s ease;">
                Record Outward Record
            </button>
        </div>
    </div>

    <!-- HISTORY SECTION -->
    <div class="card" style="background: white; padding: 2rem; border-radius: 20px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
            <h3 style="color: var(--gray-800); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 0.8rem;">
                <i class="fas fa-history" style="color: var(--red-500);"></i> Outward Records History
            </h3>
            <div style="display: flex; gap: 1rem; align-items: center;">
                <select id="outwardHistMonth" class="form-control" style="width: 140px; border-radius: 8px; font-weight: 600;">
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                </select>
                <select id="outwardHistYear" class="form-control" style="width: 100px; border-radius: 8px; font-weight: 600;">
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                </select>
                <button class="btn btn-danger" onclick="refreshStoreOutwardHistory()" style="border-radius: 8px; padding: 6px 15px; font-weight: 700;">Search</button>
                <button class="btn btn-outline-secondary" onclick="printStoreHistory('OUTWARD')" style="border-radius: 8px; padding: 6px 15px; font-weight: 700;">
                    <i class="fas fa-print"></i> Print
                </button>
            </div>
        </div>

        <div id="storeOutwardHistoryTableContainer" style="overflow-x: auto;">
            <table class="table" style="width: 100%; border-collapse: separate; border-spacing: 0 10px;">
                <thead style="background: #fff5f5;">
                    <tr style="color: #9b2c2c; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px;">
                        <th style="padding: 15px; border-radius: 10px 0 0 10px;">Date & Time</th>
                        <th style="padding: 15px;">Item Code</th>
                        <th style="padding: 15px;">Item Name</th>
                        <th style="padding: 15px; text-align: center;">Qty</th>
                        <th style="padding: 15px;">Issued To / By</th>
                        <th style="padding: 15px; text-align: right; border-radius: 0 10px 10px 0;">Actions</th>
                    </tr>
                </thead>
                <tbody id="storeOutwardHistoryBody">
                    <!-- History records here -->
                </tbody>
            </table>
        </div>
    </div>
</div>
