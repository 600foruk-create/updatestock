<div id="loginPage">
        <div class="login-container">
            <div class="login-header">
                <h1 id="loginTitle">📦 StockFlow</h1>
                <p>Login to your account</p>
            </div>
            <div class="login-form">
                <form autocomplete="off" onsubmit="event.preventDefault(); login();">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="username" placeholder="Enter username" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <div class="password-field">
                            <input type="password" id="password" placeholder="Enter password" autocomplete="new-password">
                            <span class="toggle-password" onclick="togglePassword('password')">👁️</span>
                        </div>
                    </div>
                    <button type="submit" class="login-btn">Login</button>
                </form>
            </div>
        </div>
    </div>