<div class="store-inventory">
    <div class="card" style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid var(--gray-200); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 2rem;">
            <button class="btn btn-primary btn-lg" onclick="toggleMainCategoryForm()" style="box-shadow: 0 4px 12px rgba(12, 166, 242, 0.3); font-weight: 700; border-radius: 12px; padding: 0.8rem 1.8rem;">
                ➕ New Main Category
            </button>
        </div>

        <div id="newMainCategoryFormContainer" style="display: none; margin-bottom: 2rem;">
            <div class="card" style="background: var(--blue-50); border: 2px dashed var(--blue-200); padding: 2rem; border-radius: 20px;">
                <h3 style="color: var(--blue-700); margin-bottom: 1.5rem;">🆕 Add New Main Category</h3>
                <div class="row">
                    <div class="col-md-5">
                        <div class="form-group">
                            <label style="font-weight: 700;">Category Name</label>
                            <input type="text" id="storeCatName" class="form-control" placeholder="e.g., General Store">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label style="font-weight: 700;">Category Code (Manual)</label>
                            <input type="text" id="storeCatCodeManual" class="form-control" placeholder="e.g., ST-01">
                        </div>
                    </div>
                    <div class="col-md-3" style="display: flex; align-items: flex-end; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="addStoreCategory()" style="height: 42px; flex: 1;">Save</button>
                        <button class="btn btn-secondary" onclick="toggleMainCategoryForm()" style="height: 42px;">Cancel</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="storeCategoriesContainer">
            <div style="text-align: center; padding: 3rem; color: var(--gray-400);">
                <i class="fas fa-spinner fa-spin fa-2x"></i>
                <p style="margin-top: 1rem;">Loading inventory structure...</p>
            </div>
        </div>
    </div>
</div>

