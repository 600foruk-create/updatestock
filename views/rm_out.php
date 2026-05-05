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
    </div    <div class="form-card" style="margin-bottom: 2rem; background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Segmented Control Style Toggles -->
        <div style="margin-bottom: 1.5rem; display: flex; background: var(--gray-100); padding: 5px; border-radius: 12px; max-width: 400px; border: 1px solid var(--gray-200);">
            <label style="flex: 1;">
                <input type="radio" name="rmOutMode" value="SINGLE" checked onclick="toggleRMOutMode()" style="display: none;">
                <div class="mode-toggle-btn active" id="modeBtn_SINGLE" onclick="setRMOutMode('SINGLE')" style="text-align:center; padding: 10px; border-radius: 10px; cursor: pointer; font-weight: 700; transition: 0.3s; font-size: 0.9rem;">
                    Single / Multiple Items
                </div>
            </label>
            <label style="flex: 1;">
                <input type="radio" name="rmOutMode" value="FORMULA" onclick="toggleRMOutMode()" style="display: none;">
                <div class="mode-toggle-btn" id="modeBtn_FORMULA" onclick="setRMOutMode('FORMULA')" style="text-align:center; padding: 10px; border-radius: 10px; cursor: pointer; font-weight: 700; transition: 0.3s; font-size: 0.9rem;">
                    Use Formula
                </div>
            </label>
        </div>

        <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem; align-items: center;">
            <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
                <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.4rem; font-size: 0.85rem; display: block;">Issue Date</label>
                <input type="date" id="rmOutDate" class="form-control" style="height: 40px; border-radius: 6px; border: 1px solid #cbd5e1; width: 100%;">
            </div>
            <div style="flex-grow: 1;">
                <h4 id="rmOutTitle" style="margin: 0; color: var(--sky-700); font-size: 1.1rem;">🏗️ New Material Issuance</h4>
                <p id="rmOutSubTitle" style="margin: 0; font-size: 0.8rem; color: var(--gray-500);">Record raw materials being issued to the factory.</p>
            </div>
        </div>

        <!-- Single/Multiple Items Mode -->
        <div id="rmOutSingleGroup">
            <div id="rmOutRowsContainer" style="overflow-x: auto; margin-bottom: 1rem;">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px;">
                    <thead>
                        <tr style="text-align: left; font-size: 0.85rem; color: var(--gray-600);">
                            <th style="padding: 0 0.5rem;">Raw Material</th>
                            <th style="padding: 0 0.5rem; width: 200px;">Quantity</th>
                            <th style="padding: 0 0.5rem;">Reference / Notes</th>
                            <th style="width: 50px;"></th>
                        </tr>
                    </thead>
                    <tbody id="rmOutRows"></tbody>
                </table>
            </div>
            <button class="btn btn-info" onclick="addRMOutRow()" style="padding: 0.5rem 1.2rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                <span>➕ Add Material</span>
            </button>
        </div>
        
        <!-- Formula Mode -->
        <div id="rmOutFormulaGroup" style="display: none; margin-bottom: 1.5rem;">
            <div class="settings-grid" style="display: grid; grid-template-columns: 1.5fr 1fr 1.5fr; gap: 1rem; align-items: flex-end; background: #f8fafc; padding: 1.2rem; border-radius: 12px; border: 1px solid #e2e8f0;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Select Production Formula</label>
                    <select id="rmOutFormulaSelect" class="form-control" onchange="previewFormulaUsage()" style="height: 48px; border-radius: 8px; border: 2px solid var(--sky-500); width: 100%;"></select>
                </div>
                <div class="form-group" style="margin-bottom: 0; position: relative;">
                    <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Total Batches</label>
                    <div class="input-group" style="display:flex; align-items:stretch; height: 48px; border: 2px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: white;">
                        <input type="number" id="rmOutFormulaMultiplier" class="form-control" style="border: none; padding: 0.6rem 1rem; font-size: 1rem; flex:1; height: 100%;" value="1" oninput="previewFormulaUsage()">
                        <span style="background: #f1f5f9; padding: 0 1rem; display: flex; align-items: center; font-weight: 700; color: var(--gray-500);">Batches</span>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-weight: 700; color: var(--gray-700); margin-bottom: 0.5rem; font-size: 0.9rem; display: block;">Reference / Notes</label>
                    <input type="text" id="rmOutFormulaNotes" class="form-control" style="height: 48px; padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; border: 2px solid #cbd5e1; background: white; width: 100%;" placeholder="Batch #, Order ID...">
                </div>
            </div>

            <div id="formulaPreview" style="display: none; margin-top: 1rem; padding: 0.8rem; background: var(--sky-50); border-radius: 8px; font-size: 0.85rem; color: var(--sky-800); border-left: 4px solid var(--sky-400); border: 1.5px solid var(--sky-200);"></div>

            <div id="rmFormulaIngredientsEditor" style="display: none; margin-top: 1.5rem; padding: 1.2rem; background: #fffbff; border: 1px dashed var(--error); border-radius: 12px; box-shadow: var(--shadow-sm);">
                <h4 style="font-size: 0.85rem; color: var(--error); margin-bottom: 0.8rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; border-bottom: 2px solid var(--error); display: inline-block; padding-bottom: 2px;">Edit Quantities for this Batch:</h4>
                <div id="rmFormulaIngredientsList" style="display: flex; flex-direction: column; gap: 0.8rem;"></div>
            </div>
        </div>
        
        <div style="margin-top: 1rem; border-top: 1px solid #f1f5f9; padding-top: 1.5rem;">
            <button id="rmOutSaveBtn" class="btn btn-primary" style="background: var(--sky-600); color: white !important; display: inline-block; width: auto; padding: 0.7rem 3rem; font-size: 1.1rem; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 0 var(--sky-800); border: none;" onclick="saveRMTransaction('OUT')">
                Save Issuance
            </button>
        </div>
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
