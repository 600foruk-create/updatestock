<div class="rm-transactions">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;">
        <h2 style="margin: 0; color: var(--gray-800); display: flex; align-items: center; gap: 10px;">
            🏗️ Raw Material Issuing
        </h2>
        
        <!-- Formula Issuance Tracker -->
        <div id="rmFormulaOutMetric" style="background: white; padding: 0.5rem 1.2rem; border-radius: 12px; border: 2px solid var(--sky-500); display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="font-size: 1.4rem; background: var(--sky-100); padding: 8px; border-radius: 8px;">🥣</div>
            <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 2px;">
                    <span style="font-size: 0.7rem; font-weight: 800; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.5px;">Last Formula:</span>
                    <span id="rmLastFormulaDate" style="font-size: 0.8rem; color: var(--sky-700); font-weight: 700; background: var(--sky-50); padding: 2px 8px; border-radius: 6px; border: 1px solid var(--sky-100);">--</span>
                </div>
                <div id="rmDailyFormulaWeight" style="font-size: 1.3rem; font-weight: 900; color: var(--sky-600); line-height: 1.1;">0.0 KG</div>
                <div id="rmDailyFormulaValue" style="font-size: 0.9rem; font-weight: 700; color: var(--success); margin-top: 2px;">Rs. 0</div>
            </div>
        </div>
    </div>

    
    <div class="form-card" style="margin-bottom: 2rem; background: transparent; box-shadow: none; border: none; padding: 0;">
        <!-- Segmented Control Style Toggles -->
        <div style="margin-bottom: 2rem; display: flex; background: var(--gray-100); padding: 5px; border-radius: 12px; max-width: 500px; border: 1px solid var(--gray-200);">
            <div class="mode-toggle-btn active" id="modeBtn_SINGLE" onclick="setRMOutMode('SINGLE')" style="flex: 1; text-align:center; padding: 12px; border-radius: 10px; cursor: pointer; font-weight: 700; transition: 0.3s; font-size: 1rem;">
                Single Item
            </div>
            <div class="mode-toggle-btn" id="modeBtn_FORMULA" onclick="setRMOutMode('FORMULA')" style="flex: 1; text-align:center; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 700; transition: 0.3s; font-size: 0.95rem;">
                Use Formula
            </div>
            <input type="hidden" id="rmOutMode" value="SINGLE">
        </div>
                <div class="form-group" style="margin-bottom: 1rem;">
            <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Issue Date</label>
            <input type="date" id="rmOutDate" class="form-control" style="height: 40px; border-radius: 8px; border: 2px solid #cbd5e1; width: 250px; background: white;">
        </div>

        <!-- Single Item Mode Container -->
        <div id="rmOutSingleContainer" style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 1rem;">
            <div id="rmOutRowsHeader" style="display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr 40px; gap: 1rem; margin-bottom: 0.5rem; padding: 0 1rem; color: var(--gray-600); font-size: 0.85rem; font-weight: 700;">
                <div>Raw Material</div>
                <div>Quantity</div>
                <div>Unit</div>
                <div>Notes</div>
                <div></div>
            </div>
            <div id="rmOutRows" style="display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1rem;"></div>
            <button class="btn btn-info" style="margin-bottom: 0.5rem;" onclick="addRMOutRow()">➕ Add Another Material</button>
        </div>
        
        <!-- Formula Mode Container -->
        <div id="rmOutFormulaContainer" style="display: none; background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid var(--sky-200); margin-bottom: 1rem; border-left: 5px solid var(--sky-500);">
            <div style="display: grid; grid-template-columns: 1.5fr 1fr 1.5fr; gap: 1.5rem; align-items: flex-end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Select Production Formula</label>
                    <select id="rmOutFormulaSelect" class="form-control" onchange="previewFormulaUsage()" style="height: 48px; padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; border: 2px solid var(--sky-500); width: 100%; background: white;"></select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Batch Multiplier</label>
                    <input type="number" id="rmOutFormulaQty" class="form-control" style="height: 48px; padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; border: 2px solid #cbd5e1; background: white; width: 100%;" value="1" step="0.1" oninput="recalculateFormulaTotalValue()">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Formula Reference Notes</label>
                    <input type="text" id="rmOutFormulaNotes" class="form-control" style="height: 48px; padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; border: 2px solid #cbd5e1; background: white; width: 100%;" placeholder="Batch #, Order ID...">
                </div>
            </div>
        </div>

        <div id="formulaPreview" style="display: none; margin-top: 1rem; padding: 0.8rem; background: var(--sky-50); border-radius: 8px; font-size: 0.85rem; color: var(--sky-800); border-left: 4px solid var(--sky-400); border: 1.5px solid var(--sky-200);"></div>

        <!-- NEW: Formula Editor moved OUTSIDE the grid to prevent layout shifts -->
        <div id="rmFormulaIngredientsEditor" style="display: none; margin-top: 1.5rem; padding: 1.2rem; background: #fffbff; border: 1px dashed var(--error); border-radius: 12px; box-shadow: var(--shadow-sm);">
            <h4 style="font-size: 0.85rem; color: var(--error); margin-bottom: 0.8rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; border-bottom: 2px solid var(--error); display: inline-block; padding-bottom: 2px;">Edit Quantities for this Batch:</h4>
            <div id="rmFormulaIngredientsList" style="display: flex; flex-direction: column; gap: 0.8rem;"></div>
        </div>
        
        <div style="margin-top: 2rem; padding-bottom: 10px; display: flex; gap: 1rem; align-items: center;">
            <button id="rmOutSaveBtn" class="btn btn-primary" style="background: var(--sky-600); color: white !important; display: inline-block; width: auto; padding: 0.7rem 3rem; font-size: 1.1rem; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 0 var(--sky-800); border: none; cursor: pointer; transition: 0.2s;" onclick="saveRMTransaction('OUT')">Save</button>
            <button id="rmOutFormulaCancelBtn" class="btn btn-danger" style="display: none; background: #ef4444; color: white !important; padding: 0.7rem 2rem; font-size: 1rem; font-weight: 700; border-radius: 8px; border: none; cursor: pointer; transition: 0.2s;" onclick="clearFormulaSelection()">Cancel Selection</button>
        </div>
    </div>

    <div class="table-container">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0; color: var(--gray-800);">Recent Consumption History</h3>
            <div style="display: flex; gap: 0.8rem;">
                <button class="btn" style="background: #27ae60; color: white; display: flex; align-items: center; gap: 5px;" onclick="exportRMOutToExcel()">
                    <span>📊 Export Excel</span>
                </button>
                <button class="btn btn-danger" style="display: flex; align-items: center; gap: 5px;" onclick="deleteAllRMOutHistory()">
                    <span>🗑️ Delete All</span>
                </button>
            </div>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Material / Formula</th>
                    <th>Type</th>
                    <th>Qty / Multiplier</th>
                    <th>Notes</th>
                    <th style="width: 80px; text-align: center;">Action</th>
                </tr>
            </thead>
            <tbody id="rmOutTable"></tbody>
        </table>
    </div>
</div>

<style>
.mode-toggle-btn.active {
    background: var(--sky-600);
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    color: white;
}
.mode-toggle-btn:not(.active):hover {
    background: var(--gray-300);
}
.mode-toggle-btn:not(.active) {
    color: var(--gray-700);
}
</style>

