<div id="reports" class="tab-content">
    <div class="search-filter-bar no-print">
        <h2 style="color: var(--sky-600); margin: 0;">📁 Reports Archive</h2>
        <p style="color: var(--gray-500); margin-top: 0.2rem;">Access and manage your saved historical audit reports.</p>
    </div>

    <div style="background: white; overflow-x: auto;">
        <style>
            #reportsArchiveTable {
                border: 1px solid #000 !important;
                border-collapse: collapse !important;
            }
            #reportsArchiveTable th,
            #reportsArchiveTable td {
                border: 1px solid #000 !important;
            }
            #reportsArchiveTable th {
                padding: 0.4rem 0.5rem !important;
                font-size: 0.85rem !important;
            }
            #reportsArchiveTable td {
                padding: 0.3rem 0.5rem !important;
                font-size: 0.85rem !important;
            }
        </style>
        <table class="data-table" id="reportsArchiveTable" style="margin-bottom: 0;">
            <thead style="background: var(--gray-50);">
                <tr>
                    <th style="text-align: left;">Report Title</th>
                    <th style="text-align: left;">Date Saved</th>
                    <th style="text-align: center;">Actions</th>
                </tr>
            </thead>
            <tbody id="archivedReportsBody">
                <!-- Data will be injected here -->
                <tr>
                    <td colspan="3" style="text-align: center; padding: 0.2rem 0.5rem; color: var(--gray-400);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📂</div>
                        No archived reports found.
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

