<div id="orders" class="tab-content">
                    <div class="action-buttons">
                        <button class="btn btn-success" onclick="showNewOrderForm()">➕ New Order</button>
                    </div>
                    <div class="filter-buttons" style="margin:1rem 0; display: flex; gap: 0.6rem; flex-wrap: wrap;">
                        <button class="btn btn-sm" id="btn-all" onclick="filterOrders('all')" style="display: flex; align-items: center; gap: 0.5rem;">All <span id="count-all" style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">0</span></button>
                        <button class="btn btn-sm" id="btn-pending" onclick="filterOrders('pending')" style="display: flex; align-items: center; gap: 0.5rem;">Pending <span id="count-pending" style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">0</span></button>
                        <button class="btn btn-sm" id="btn-processing" onclick="filterOrders('processing')" style="display: flex; align-items: center; gap: 0.5rem;">Processing <span id="count-processing" style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">0</span></button>
                        <button class="btn btn-sm" id="btn-completed" onclick="filterOrders('completed')" style="display: flex; align-items: center; gap: 0.5rem;">Completed <span id="count-completed" style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">0</span></button>
                    </div>

                    <div class="filter-bar" style="display: flex; gap: 0.4rem; margin-bottom: 1rem; background: var(--gray-50); padding: 0.5rem; border-radius: 8px; border: 1px solid var(--gray-200); align-items: center; overflow: hidden; width: 100%;">
                        <div style="display: flex; gap: 0.3rem; flex: 1; align-items: center;">
                            <input type="text" id="orderSearch" placeholder="Search Customer..." onkeyup="refreshOrdersList()" style="width: 130px; padding: 0.3rem 0.4rem; border: 1px solid var(--gray-300); border-radius: 4px; font-size: 0.75rem; outline: none;">
                            
                            <select id="orderMonthFilter" onchange="refreshOrdersList()" style="padding: 0.3rem 0.4rem; border: 1px solid var(--gray-300); border-radius: 4px; font-size: 0.75rem; width: 90px; outline: none;">
                                <option value="">Month</option>
                                <option value="1">Jan</option>
                                <option value="2">Feb</option>
                                <option value="3">Mar</option>
                                <option value="4">Apr</option>
                                <option value="5">May</option>
                                <option value="6">Jun</option>
                                <option value="7">Jul</option>
                                <option value="8">Aug</option>
                                <option value="9">Sep</option>
                                <option value="10">Oct</option>
                                <option value="11">Nov</option>
                                <option value="12">Dec</option>
                            </select>
                            <select id="orderYearFilter" onchange="refreshOrdersList()" style="padding: 0.3rem 0.4rem; border: 1px solid var(--gray-300); border-radius: 4px; font-size: 0.75rem; width: 70px; outline: none;">
                                <option value="">Year</option>
                            </select>

                            <div style="display: flex; align-items: center; gap: 0.2rem;">
                                <input type="date" id="orderDateFrom" onchange="refreshOrdersList()" style="padding: 0.3rem 0.2rem; border: 1px solid var(--gray-300); border-radius: 4px; font-size: 0.75rem; width: 100px; outline: none;">
                                <span style="color: var(--gray-500); font-size: 0.7rem;">to</span>
                                <input type="date" id="orderDateTo" onchange="refreshOrdersList()" style="padding: 0.3rem 0.2rem; border: 1px solid var(--gray-300); border-radius: 4px; font-size: 0.75rem; width: 100px; outline: none;">
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.3rem; align-items: center;">
                            <button class="btn btn-warning" onclick="clearOrdersView()" style="white-space: nowrap; padding: 0.3rem 0.5rem; font-size: 0.75rem; border-radius: 4px; line-height: 1.2;">Clear Screen</button>
                            <button class="btn btn-info" onclick="resetOrderFilters()" style="white-space: nowrap; padding: 0.3rem 0.5rem; font-size: 0.75rem; border-radius: 4px; line-height: 1.2;">Reset</button>
                        </div>
                    </div>
                    
                    <div id="newOrderForm" style="display: none; background: var(--gray-100); padding: 1.5rem; border-radius: 1rem; margin-bottom: 1rem;">
                        <h3 style="color: var(--sky-600);">Create New Order</h3>
                        <div style="display: flex; gap: 1rem; align-items: flex-end; margin-bottom: 1rem;">
                            <div class="form-group" style="flex: 0 0 250px; margin-bottom: 0;">
                                <label>Date</label>
                                <input type="datetime-local" id="orderDate" class="form-control" style="padding: 0.4rem; font-size: 0.9rem;">
                            </div>
                            <div class="form-group" style="flex: 0 0 500px; margin-bottom: 0;">
                                <label>Customer</label>
                                <div style="display:flex; gap:0.5rem; align-items:center;">
                                    <div id="newCustomerWrapper" style="flex:1;"></div>
                                    <button type="button" class="btn btn-success" onclick="showAddCustomerModal()" style="padding: 0.4rem 0.8rem; font-size: 0.9rem; white-space: nowrap;">➕ Add New</button>
                                </div>
                            </div>
                        </div>
                        <div id="newOrderRows"></div>
                        <button class="btn btn-info" onclick="addNewOrderRow()">➕ Add Item</button>
                        <br><br>
                        <button class="btn btn-primary" onclick="saveNewOrder()">Save Order</button>
                        <button class="btn btn-danger" onclick="hideNewOrderForm()">Cancel</button>
                    </div>
                    
                    <div id="customerOrdersList"></div>
                </div>
