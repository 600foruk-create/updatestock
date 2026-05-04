<div id="customers" class="tab-content">
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="showAddCustomerModal()">➕ Add Customer</button>
                        <button class="btn btn-success" onclick="showAddCustProvinceModal()">➕ Add Province</button>
                    </div>
                    <input type="text" id="customerSearch" placeholder="Search customers..." onkeyup="filterCustomers()" style="width:100%; padding:0.5rem; border:1px solid var(--gray-300); border-radius:50px; margin:1rem 0;">
                    <div id="customersList" class="categories-container"></div>
                </div>