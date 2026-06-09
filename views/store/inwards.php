<div class="store-inwards" style="padding: 1rem;">
    <!-- INWARD FORM -->
    <style>
        .store-form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid var(--sky-200);
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
            color: var(--gray-700);
            font-size: 0.85rem;
            margin: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .store-control {
            height: 38px !important;
            border-radius: 6px !important;
            border: 2px solid #000 !important;
            padding: 0.4rem 0.6rem !important;
            font-size: 0.9rem !important;
            width: 100% !important;
            background: #fff !important;
        }
        .store-control:focus {
            border-color: var(--sky-500) !important;
            outline: none;
        }
        .select2-container--default .select2-selection--single {
            height: 38px !important;
            border: 2px solid #000 !important;
            border-radius: 6px !important;
            display: flex !important;
            align-items: center !important;
        }
        .select2-container--default .select2-selection--single .select2-selection__rendered {
            padding-left: 0.6rem !important;
            font-size: 0.9rem !important;
        }
    </style>
    <div class="store-form-grid">
        <div class="store-field">
            <label>Select Item</label>
            <select id="storeInwardItemSelect" class="form-control select2 store-control" style="width: 100%;">
                <!-- Populated by JS -->
            </select>
        </div>
        
        <div class="store-field">
            <label>Quantity</label>
            <input type="number" id="storeInwardQty" class="store-control" value="1" min="1" step="0.01">
        </div>

        <div class="store-field">
            <label>Supplier / Source</label>
            <input type="text" id="storeInwardSource" class="store-control" placeholder="Vendor name or Department">
        </div>

        <div class="store-field">
            <label>Remarks / Notes</label>
            <input type="text" id="storeInwardNotes" class="store-control" placeholder="Any additional details...">
        </div>

        <div style="grid-column: span 2; display: flex; justify-content: flex-end; margin-top: 0.5rem; border-top: 1px solid var(--sky-200); padding-top: 1.5rem;">
            <button class="btn btn-primary" onclick="saveStoreInward()" style="padding: 0.6rem 2rem; font-weight: 700; border-radius: 8px;">
                Save Inward Record
            </button>
        </div>
    </div>

    <!-- HISTORY SECTION -->
    <div class="card" style="background: white; padding: 2rem; border-radius: 20px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
            <h3 style="color: var(--gray-800); margin: 0; font-weight: 800; display: flex; align-items: center; gap: 0.8rem;">
                <i class="fas fa-history" style="color: var(--sky-500);"></i> Inward Records History
            </h3>
            <div style="display: flex; gap: 1rem; align-items: center;">
                <select id="inwardHistMonth" class="form-control" style="width: 140px; border-radius: 8px; font-weight: 600;">
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
                <select id="inwardHistYear" class="form-control" style="width: 100px; border-radius: 8px; font-weight: 600;">
                    <option value="2023">2023</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                </select>
                <button class="btn btn-primary" onclick="refreshStoreInwardHistory()" style="border-radius: 8px; padding: 6px 15px; font-weight: 700;">Search</button>
                <button class="btn btn-outline-secondary" onclick="printStoreHistory('INWARD')" style="border-radius: 8px; padding: 6px 15px; font-weight: 700;">
                    <i class="fas fa-print"></i> Print
                </button>
            </div>
        </div>

        <style>
            #storeInwardHistoryTable {
                border: 1px solid #000 !important;
                border-collapse: collapse !important;
            }
            #storeInwardHistoryTable th,
            #storeInwardHistoryTable td {
                border: 1px solid #000 !important;
            }
            #storeInwardHistoryTable th {
                padding: 0.4rem 0.5rem !important;
                font-size: 0.85rem !important;
            }
            #storeInwardHistoryTable td {
                padding: 0.3rem 0.5rem !important;
                font-size: 0.85rem !important;
            }
        </style>
        <div id="storeInwardHistoryTableContainer" style="overflow-x: auto;">
            <table class="table" id="storeInwardHistoryTable" style="width: 100%; margin-bottom: 0;">
                <thead style="background: #f1f5f9;">
                    <tr style="color: var(--gray-700); font-weight: 700;">
                        <th>Date & Time</th>
                        <th>Item Code</th>
                        <th>Item Name</th>
                        <th style="text-align: center;">Qty</th>
                        <th>Supplier/Source</th>
                        <th style="text-align: center; width: 100px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="storeInwardHistoryBody">
                    <!-- History records here -->
                </tbody>
            </table>
        </div>
    </div>
</div>
