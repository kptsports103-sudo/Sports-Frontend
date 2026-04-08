import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import AdminLayout from "../admin/AdminLayout";
import SuperAdminLayout from "./SuperAdminLayout";

const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 14,
  borderRadius: 8,
  border: "1px solid #ccc"
};

const previewBox = {
  background: "white",
  padding: 10,
  borderRadius: 8,
  marginBottom: 10,
  fontSize: 14
};

const flowShellStyle = {
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",
  background: "#f0f4ff",
  padding: "24px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const flowCardStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  width: "100%",
  maxWidth: "1280px",
  background: "white",
  borderRadius: "20px",
  overflow: "hidden",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
};

const flowPanelStyle = {
  padding: "40px",
  minWidth: 0
};

const IAMUsers = () => {
  const { user, autoLoginFromToken } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const hasValidToken = token && token.trim() !== '';
  const currentUserRole = String(user?.role || "").toLowerCase();

  const roleOptions = [
    { value: "creator", label: "Creator" },
    { value: "admin", label: "Admin" },
  ];
  const defaultRole = "creator";
  const isRoleAllowed = (role) => roleOptions.some((option) => option.value === role);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [step, setStep] = useState("email");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "creator"
  });
  const [otpDeliveryMethod, setOtpDeliveryMethod] = useState("email"); // "email" or "sms"
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [code, setCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [createdUser, setCreatedUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const Layout = currentUserRole === "superadmin" ? SuperAdminLayout : AdminLayout;

  const renderInLayout = (content) => (
    <Layout>
      <section style={flowShellStyle}>{content}</section>
    </Layout>
  );

  useEffect(() => {
    if (hasValidToken) {
      resolveToken();
    }
  }, [defaultRole, hasValidToken]);

  useEffect(() => {
    if (isRoleAllowed(selectedRole)) return;
    setSelectedRole(defaultRole);
    setForm((current) => ({ ...current, role: defaultRole }));
  }, [defaultRole, selectedRole]);

  const resolveToken = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/iam/resolve-token?token=${token}`);
      const { phone, role } = response.data;
      const resolvedRole = isRoleAllowed(role) ? role : defaultRole;
      if (role && !isRoleAllowed(role)) {
        setError("Only admin and creator roles are available here.");
      }
      setForm(f => ({
        ...f,
        phone: phone || "",
        role: resolvedRole
      }));
      setSelectedRole(resolvedRole);
    } catch (err) {
      setError("Invalid or expired invitation link");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    if (!form.email) {
      setError("Email address is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // Update form with selected role
      setForm(f => ({ ...f, role: selectedRole }));
      const payload = { email: form.email };
      if (hasValidToken) {
        payload.token = token;
      }
      await api.post("/iam/send-otp", payload);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const payload = { email: form.email, otp: code };
      if (hasValidToken) {
        payload.token = token;
      }
      await api.post("/iam/verify-otp-onboarding", payload);
      setStep("profile");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOTP = async () => {
    if (!phoneCode || phoneCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      console.log('=== PHONE OTP VERIFICATION DEBUG ===');
      console.log('Created user ID:', createdUser?.id);
      console.log('Phone code:', phoneCode);
      
      // Use the new phone OTP verification endpoint
      const response = await api.post("/iam/verify-phone-otp", { 
        userId: createdUser.id, 
        otp: phoneCode 
      });
      
      console.log('Phone OTP response:', response.data);
      
      const { user, token } = response.data;
      
      console.log('User from response:', user);
      console.log('Token from response:', token);
      console.log('User role:', user?.role);
      
      // For Creator role, automatically log them in using AuthContext and redirect to Creator Dashboard
      if (user?.role === 'creator') {
        console.log('=== AUTO-LOGIN CREATOR ===');
        console.log('Calling autoLoginFromToken with:', { token, user });
        
        // Use AuthContext to properly set up the login session
        autoLoginFromToken(token, user);
        
        console.log('Auto-login completed, redirecting to Creator Dashboard...');
        
        // Small delay to ensure AuthContext is updated
        setTimeout(() => {
          window.location.href = '/admin/creator-dashboard';
        }, 500);
      } else {
        console.log('Not a creator, showing done step');
        setStep("done");
      }
    } catch (err) {
      console.error('=== PHONE OTP ERROR ===');
      console.error('Error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      // Only send token if it exists and is valid (for invitation-based onboarding)
      const payload = { ...form };
      if (hasValidToken) {
        payload.token = token;
      }
      if (profileImage) {
        payload.profileImage = profileImage; // base64 image
      }
      const response = await api.post("/iam/create-user", payload);
      const { requiresPhoneVerification, user } = response.data;
      setCreatedUser(user);

      if (requiresPhoneVerification) {
        setStep("phone-verify");
      } else {
        setStep("done");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create account");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetProcess = () => {
    setStep("email");
    setForm({
      name: "",
      phone: "",
      email: "",
      password: "",
      role: "creator"
    });
    setCode("");
    setError("");
  };

  if (loading && step === "email") {
    return renderInLayout(
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Resolving invitation...</p>
      </div>
    );
  }

  if (step === "email") {
    return renderInLayout(
        <div style={flowCardStyle}>

          {/* LEFT FORM */}
          <div style={flowPanelStyle}>
            <img src="/KPT 1.png" alt="KPT Logo" style={{ width: "120px", marginBottom: "20px" }} />
            <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px", color: "#000" }}>Verify Email</h2>
            <p style={{ color: "#6b7280", marginBottom: "24px" }}>
              Enter your email and select your role to continue
            </p>

            {error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="iam-role" style={{ fontWeight: 600, color: "#000" }}>User Role *</label>
              <select
                id="iam-role"
                name="iam-role"
                value={selectedRole}
                disabled={!!token}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "6px", color: "#000" }}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value} style={{ color: "#000" }}>
                    {option.label}
                  </option>
                ))}
              </select>
              {(currentUserRole === "admin" || currentUserRole === "superadmin") && (
                <small style={{ color: "#6b7280" }}>
                  Only admin and creator accounts can be created here.
                </small>
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="email" style={{ fontWeight: 600, color: "#000" }}>Email Address *</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={form.email}
                disabled={!!form.email && !!token}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #d1d5db", marginTop: "6px", color: "#000" }}
              />
              <small style={{ color: "#6b7280" }}>
                We'll send a 6-digit code to your email for verification
              </small>
            </div>

            <button
              onClick={sendOTP}
              disabled={loading || !form.email}
              style={{
                width: "100%",
                padding: "14px",
                background: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                cursor: loading || !form.email ? "not-allowed" : "pointer",
                opacity: loading || !form.email ? 0.6 : 1
              }}
            >
              {loading ? "Sending Code..." : "Send Code"}
            </button>
          </div>

          {/* RIGHT STEPS PANEL */}
          <div style={{
            ...flowPanelStyle,
            color: "white",
            background: "linear-gradient(135deg, #0f1c2f, #1f4b7a)",
            position: "relative"
          }}>
            <h2 style={{ fontSize: "26px", marginBottom: "30px" }}>Mobile Verification Steps</h2>

            <div style={{ display: "flex", marginBottom: "24px" }}>
              <div style={{ width: "16px", height: "16px", background: "#6c6cff", borderRadius: "50%", marginRight: "16px", marginTop: "6px" }} />
              <div>
                <div style={{ background: "#6c6cff", display: "inline-block", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", marginBottom: "6px" }}>
                  STEP 1
                </div>
                <div>Enter your email above and select your user role</div>
              </div>
            </div>

            <div style={{ display: "flex" }}>
              <div style={{ width: "16px", height: "16px", background: "#6c6cff", borderRadius: "50%", marginRight: "16px", marginTop: "6px" }} />
              <div>
                <div style={{ background: "#6c6cff", display: "inline-block", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", marginBottom: "6px" }}>
                  STEP 2
                </div>
                <div>Check your email for a 6-digit code and enter it to verify.</div>
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (step === "otp") {
    return renderInLayout(
        <div style={flowCardStyle}>

          {/* LEFT FORM */}
          <div style={flowPanelStyle}>
            <img src="/KPT 1.png" alt="KPT Logo" style={{ width: "120px", marginBottom: "20px" }} />
            <h2 style={{ fontSize: "28px", fontWeight: "700", marginBottom: "8px", color: "#000" }}>Enter Verification Code</h2>
            <p style={{ color: "#6b7280", marginBottom: "24px" }}>
              Verify your email address
            </p>

            {error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <p style={{ color: "#000", marginBottom: "8px" }}>A 6-digit code has been sent to</p>
            <strong style={{ color: "#000" }}>{form.email}</strong>

            <label htmlFor="otp" style={{ display: "block", marginTop: "16px", color: "#000", fontWeight: 600 }}>
              Email OTP Code
            </label>
            <input
              id="otp"
              name="otp"
              autoComplete="one-time-code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              style={{
                width: "100%",
                padding: 16,
                fontSize: 22,
                letterSpacing: 8,
                textAlign: "center",
                borderRadius: 10,
                border: "1px solid #ccc",
                margin: "20px 0",
                color: "#000"
              }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={() => setStep("email")} 
                style={{ flex: 1, padding: 14, borderRadius: 10, background: "#6b7280", color: "white", border: "none", cursor: "pointer" }}
              >
                Back
              </button>
              <button 
                onClick={verifyOTP} 
                disabled={code.length !== 6}
                style={{ flex: 1, padding: 14, borderRadius: 10, background: "#10b981", color: "white", border: "none", cursor: code.length !== 6 ? "not-allowed" : "pointer", opacity: code.length !== 6 ? 0.6 : 1 }}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </div>

          {/* RIGHT INFO PANEL */}
          <div style={{
            ...flowPanelStyle,
            color: "white",
            background: "linear-gradient(135deg, #0f1c2f, #1f4b7a)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center"
          }}>
            <h2 style={{ fontSize: "26px", marginBottom: "30px" }}>Mobile Verification Steps</h2>

            <div style={{ display: "flex", marginBottom: "24px", alignItems: "flex-start" }}>
              <div style={{ width: "16px", height: "16px", background: "#6c6cff", borderRadius: "50%", marginRight: "16px", marginTop: "6px" }} />
              <div>
                <div style={{ background: "#6c6cff", display: "inline-block", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", marginBottom: "6px" }}>
                  STEP 1
                </div>
                <div>Enter your email above and select your user role</div>
              </div>
            </div>

            <div style={{ display: "flex" }}>
              <div style={{ width: "16px", height: "16px", background: "#6c6cff", borderRadius: "50%", marginRight: "16px", marginTop: "6px" }} />
              <div>
                <div style={{ background: "#6c6cff", display: "inline-block", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", marginBottom: "6px" }}>
                  STEP 2
                </div>
                <div>Check your email for a 6-digit code and enter it to verify.</div>
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (step === "profile") {
    return renderInLayout(
        <div style={{ ...flowCardStyle, maxWidth: "1180px" }}>

          {/* LEFT FORM */}
          <div style={{ ...flowPanelStyle, padding: 30 }}>
            <div style={{ background: "#8b5cf6", color: "white", padding: 20, borderRadius: 12, textAlign: "center", marginBottom: 20 }}>
              <h2>Complete Profile</h2>
              <p>Set up your account details</p>
            </div>

            {error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "8px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <label htmlFor="name" style={{ color: "#000", fontWeight: 600 }}>Full Name *</label>
            <input id="name" name="name" autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" style={{ ...inputStyle, color: "#000" }} />

            <label htmlFor="phone" style={{ color: "#000", fontWeight: 600 }}>Mobile Number *</label>
            <input id="phone" name="phone" autoComplete="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10-digit mobile" style={{ ...inputStyle, color: "#000" }} />

            <label htmlFor="password" style={{ color: "#000", fontWeight: 600 }}>Password *</label>
            <input id="password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Strong password" style={{ ...inputStyle, color: "#000" }} />

            <label htmlFor="profileImage" style={{ color: "#000", fontWeight: 600 }}>Profile Image</label>
            <input
              id="profileImage"
              name="profileImage"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onloadend = () => {
                  setProfileImage(reader.result); // base64 image
                  setProfileImagePreview(reader.result);
                };
                reader.readAsDataURL(file);
              }}
              style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", marginBottom: "8px" }}
            />

            {profileImagePreview && (
              <img
                src={profileImagePreview}
                alt="Preview"
                style={{ marginTop: "8px", width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #d1d5db" }}
              />
            )}

            <button onClick={createUser}
              disabled={loading || !form.name || !form.password}
              style={{ width: "100%", padding: 14, borderRadius: 10, background: "#8b5cf6", color: "white", fontWeight: 600, opacity: loading || !form.name || !form.password ? 0.6 : 1 }}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </div>

          {/* RIGHT SIDEBAR PREVIEW */}
          <div style={{ ...flowPanelStyle, background: "#f8fafc", padding: 30 }}>
            <h3 style={{ color: "#000" }}>Login Preview</h3>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <img
                src={profileImage || "/avatar.png"}
                alt="Profile preview"
                style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover" }}
              />
            </div>

            <div style={{ ...previewBox, color: "#000" }}><strong>Email:</strong> {form.email}</div>
            <div style={{ ...previewBox, color: "#000" }}><strong>Password:</strong> {form.password || "••••••"}</div>
            <div style={{ ...previewBox, color: "#000" }}><strong>Role:</strong> {form.role}</div>

            <p style={{ color: "#000", fontSize: 13, marginTop: 10 }}>
              These details will be used to log in.
            </p>
          </div>
        </div>
    );
  }

  if (step === "phone-verify") {
    return renderInLayout(
        <div style={{ width: "100%", maxWidth: 480, background: "white", borderRadius: 16, boxShadow: "0 12px 30px rgba(0,0,0,.1)", overflow: "hidden" }}>

          <div style={{ background: "#10b981", color: "white", padding: 24, textAlign: "center" }}>
            <h2>Verify Phone Number</h2>
            <p>Verify your mobile number</p>
          </div>

          <div style={{ padding: 24, textAlign: "center" }}>
            {error && (
              <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px", borderRadius: "8px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <p>A 6-digit code has been sent to</p>
            <strong>{form.phone}</strong>

            <label htmlFor="phone-otp" style={{ display: "block", marginTop: "16px", fontWeight: 600 }}>
              Phone OTP Code
            </label>
            <input
              id="phone-otp"
              name="phone-otp"
              autoComplete="one-time-code"
              inputMode="numeric"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              style={{
                width: "100%",
                padding: 16,
                fontSize: 22,
                letterSpacing: 8,
                textAlign: "center",
                borderRadius: 10,
                border: "1px solid #ccc",
                margin: "20px 0"
              }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep("profile")} style={{ flex: 1, padding: 12, borderRadius: 10 }}>Back</button>
              <button onClick={verifyPhoneOTP} disabled={phoneCode.length !== 6}
                style={{ flex: 1, padding: 12, borderRadius: 10, background: "#10b981", color: "white" }}>
                {loading ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          </div>
        </div>
    );
  }

  if (step === "done") {
    return renderInLayout(
        <div style={{
          width:"100%",
          maxWidth:480,
          background:"white",
          borderRadius:18,
          boxShadow:"0 12px 30px rgba(0,0,0,.12)",
          overflow:"hidden",
          textAlign:"center"
        }}>

          {/* Header */}
          <div style={{ background:"#10b981", color:"white", padding:"32px 20px" }}>
            <div style={{
              width:60,
              height:60,
              background:"rgba(255,255,255,0.2)",
              borderRadius:"50%",
              margin:"0 auto 12px",
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              fontSize:30
            }}>
              ✓
            </div>
            <h2 style={{ margin:0 }}>Account Activated!</h2>
            <p style={{ marginTop:6, opacity:.9 }}>Welcome to KPT Sports</p>
          </div>

          {/* Body */}
          <div style={{ padding:24 }}>
            <h3 style={{ marginBottom:6, color: '#000' }}>
              Welcome, {form.name || "User"}!
            </h3>
            <p style={{ color:"#000", fontSize:14, lineHeight:1.5 }}>
              Your account has been successfully activated.
              You can now log in using your email and password.
            </p>

            <div style={{
              background:"#f9fafb",
              padding:14,
              borderRadius:10,
              margin:"16px 0",
              textAlign:"left",
              fontSize:14,
              color: '#000'
            }}>
              <p style={{ color: '#000' }}><strong>Email:</strong> {form.email}</p>
              <p style={{ color: '#000' }}><strong>Role:</strong> {form.role}</p>
            </div>

            <div style={{ display:"flex", gap:12 }}>
              <button
                onClick={resetProcess}
                style={{
                  flex:1,
                  padding:12,
                  borderRadius:10,
                  border:"1px solid #000",
                  background:"#fff",
                  fontWeight:600,
                  color:"#000",
                  cursor:"pointer"
                }}
              >
                Create Another
              </button>

              <Link
                to="/admin/users-manage"
                style={{
                  flex:1,
                  padding:12,
                  borderRadius:10,
                  background:"#2563eb",
                  color:"white",
                  fontWeight:600,
                  textAlign:"center",
                  textDecoration:"none"
                }}
              >
                View All Users
              </Link>
            </div>
          </div>
        </div>
    );
  }

  return null;
};

export default IAMUsers;
