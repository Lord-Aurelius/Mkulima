import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const sessionKey = "mkulima-session";
const pendingQrKey = "mkulima-pending-qr";

function readStoredJson(key, fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function readStoredText(key, fallback = "") {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function getViews(user) {
  if (!user) {
    return [];
  }

  if (user.role === "creator") {
    return ["overview", "farms", "packages", "marketplace", "security"];
  }

  if (user.role === "admin") {
    return [
      "overview",
      "logs-admin",
      "monthly-report",
      "finance",
      "payroll",
      "duties-admin",
      "crops",
      "livestock",
      "education",
      ...(user.hasMarketplace ? ["marketplace"] : []),
      "security"
    ];
  }

  return [
    "daily-log",
    "contribution",
    "duties",
    "schedule",
    "learn",
    "production",
    ...(user.hasMarketplace ? ["marketplace"] : [])
  ];
}

const paymentStatuses = ["pending", "paid"];
const assignmentStatuses = ["assigned", "in_progress", "completed"];
const defaultProductionUnits = ["eggs", "litres", "kg", "metres", "bags", "trays", "crates"];

function emptyCropForm() {
  return { type: "", plantingDate: "", harvestDate: "", quantity: "", expectedYield: "", image: null };
}

function emptyLivestockForm() {
  return { type: "", count: "", productionMetric: "", latestMetricValue: "", image: null };
}

function App() {
  const [session, setSession] = useState(() => readStoredJson(sessionKey, null));
  const [pendingQrTarget, setPendingQrTarget] = useState(() => readStoredText(pendingQrKey, ""));
  const [user, setUser] = useState(null);
  const [view, setView] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [workerContribution, setWorkerContribution] = useState(null);
  const [farms, setFarms] = useState([]);
  const [signupRequests, setSignupRequests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [crops, setCrops] = useState([]);
  const [livestock, setLivestock] = useState([]);
  const [logs, setLogs] = useState([]);
  const [educationPosts, setEducationPosts] = useState([]);
  const [marketplaceAds, setMarketplaceAds] = useState([]);
  const [financeEntries, setFinanceEntries] = useState([]);
  const [financeSummary, setFinanceSummary] = useState({ income: 0, expense: 0, net: 0 });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", farmName: "", location: "", landSize: "" });
  const [farmForm, setFarmForm] = useState({ name: "", location: "", landSize: "", adminName: "", adminEmail: "", adminPassword: "", logo: null });
  const [packageForm, setPackageForm] = useState({ name: "", slug: "", priceMonthly: "", hasMarketplace: true, description: "" });
  const [payrollForm, setPayrollForm] = useState({ name: "", duty: "", email: "", password: "", employmentStartDate: "", payRate: "", paymentStatus: "pending" });
  const [editingWorkerId, setEditingWorkerId] = useState("");
  const [workerEditForm, setWorkerEditForm] = useState({ name: "", duty: "", email: "", employmentStartDate: "", payRate: "", paymentStatus: "pending" });
  const [dutyAssignForm, setDutyAssignForm] = useState({ workerId: "", title: "", description: "", dueDate: "" });
  const [cropForm, setCropForm] = useState(() => emptyCropForm());
  const [editingCropId, setEditingCropId] = useState("");
  const [cropEditForm, setCropEditForm] = useState(() => emptyCropForm());
  const [livestockForm, setLivestockForm] = useState(() => emptyLivestockForm());
  const [editingLivestockId, setEditingLivestockId] = useState("");
  const [livestockEditForm, setLivestockEditForm] = useState(() => emptyLivestockForm());
  const [productionForm, setProductionForm] = useState({ livestockId: "", metricValue: "", metricUnit: "", notes: "" });
  const [logForm, setLogForm] = useState({
    targetPayload: "",
    task: "",
    images: [],
    recordType: "input",
    materialType: "",
    quantity: "",
    unit: "",
    recordNotes: ""
  });
  const [educationForm, setEducationForm] = useState({ title: "", body: "", image: null });
  const [marketplaceForm, setMarketplaceForm] = useState({ title: "", contactPerson: "", location: "", price: "", phoneNumber: "", image: null });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [reportMonth, setReportMonth] = useState(() => currentMonthValue());
  const [financeMonth, setFinanceMonth] = useState(() => currentMonthValue());
  const [contributionMonth, setContributionMonth] = useState(() => currentMonthValue());
  const [financeForm, setFinanceForm] = useState({ entryType: "expense", category: "", amount: "", entryDate: todayValue(), notes: "" });

  const heroImages = [
    "https://images.pexels.com/photos/2252584/pexels-photo-2252584.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=1200"
  ];

  const views = useMemo(() => getViews(user), [user]);
  const activeQrPayload = parseQrPayloadInput(pendingQrTarget);
  const qrAccessMode = Boolean(activeQrPayload);
  const parsedQrPayload = parseQrPayloadInput(logForm.targetPayload);
  const logMaterialOptions = getLogMaterialOptions(parsedQrPayload?.targetType, logForm.recordType);
  const logUnitOptions = getMetricUnitOptions(parsedQrPayload?.label || "", parsedQrPayload?.targetType);
  const selectedProductionItem = livestock.find((item) => item.id === productionForm.livestockId);
  const productionUnitOptions = getMetricUnitOptions(selectedProductionItem?.type || "", "livestock", selectedProductionItem?.production_metric);

  useEffect(() => {
    const qrFromLocation = readQrTargetFromLocation();
    if (!qrFromLocation) {
      return;
    }

    persistPendingQr(qrFromLocation);
    setPendingQrTarget(qrFromLocation);
    setAuthMode("login");
    setNotice("QR target loaded. Log in with a worker account to submit the daily log.");
    clearQrQueryFromLocation();
  }, []);

  useEffect(() => {
    if (!session?.token) {
      setUser(null);
      return;
    }

    api.me(session.token)
      .then((data) => {
        setUser(data.user);
        setView(resolveDefaultView(data.user, pendingQrTarget));
      })
      .catch(() => clearSession(qrAccessMode));
  }, [session?.token]);

  useEffect(() => {
    if (user?.role !== "worker" || !pendingQrTarget) {
      return;
    }

    const payload = parseQrPayloadInput(pendingQrTarget);
    if (!payload) {
      clearPendingQr();
      setPendingQrTarget("");
      return;
    }

    setLogForm((current) => ({
      ...current,
      targetPayload: JSON.stringify(payload)
    }));
    setView("daily-log");
    setNotice(`QR target ready for ${payload.label || payload.targetType}. Add the work details and submit.`);
    clearPendingQr();
    setPendingQrTarget("");
    clearQrQueryFromLocation();
  }, [user, pendingQrTarget]);

  useEffect(() => {
    if (!session?.token || !user) {
      return;
    }

    refreshView(view).catch((err) => setError(err.message));
  }, [session?.token, user, view]);

  useEffect(() => {
    if (!session?.token || !user) {
      return;
    }

    if (view === "monthly-report") {
      refreshView("monthly-report").catch((err) => setError(err.message));
    }

    if (view === "finance") {
      refreshView("finance").catch((err) => setError(err.message));
    }

    if (view === "contribution") {
      refreshView("contribution").catch((err) => setError(err.message));
    }
  }, [reportMonth, financeMonth, contributionMonth]);

  async function runTask(task) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshView(targetView = view) {
    if (!session?.token || !user) {
      return;
    }

    if (targetView === "overview") {
      const calls = [api.summary(session.token)];
      if (user.role === "creator") {
        calls.push(api.farms.list(session.token), api.signupRequests.list(session.token), api.packages.list(session.token));
      }
      const [summaryResponse, farmsResponse, signupResponse, packageResponse] = await Promise.all(calls);
      setSummary(summaryResponse.summary);
      if (farmsResponse?.farms) {
        setFarms(farmsResponse.farms);
      }
      if (signupResponse?.requests) {
        setSignupRequests(signupResponse.requests);
      }
      if (packageResponse?.packages) {
        setPackages(packageResponse.packages);
      }
    }

    if (targetView === "logs-admin") {
      const data = await api.logs.list(session.token);
      setLogs(data.logs);
    }

    if (targetView === "monthly-report") {
      const data = await api.dashboard.monthlyReport(session.token, reportMonth);
      setMonthlyReport(data.report);
    }

    if (targetView === "finance") {
      const data = await api.finance.list(session.token, financeMonth);
      setFinanceEntries(data.entries);
      setFinanceSummary(data.summary);
    }

    if (targetView === "farms") {
      const [farmResponse, packageResponse] = await Promise.all([
        api.farms.list(session.token),
        api.packages.list(session.token)
      ]);
      setFarms(farmResponse.farms);
      setPackages(packageResponse.packages);
    }

    if (targetView === "packages") {
      const [packageResponse, farmResponse] = await Promise.all([
        api.packages.list(session.token),
        api.farms.list(session.token)
      ]);
      setPackages(packageResponse.packages);
      setFarms(farmResponse.farms);
    }

    if (targetView === "payroll") {
      const data = await api.workers.list(session.token);
      setWorkers(data.workers);
    }

    if (targetView === "duties-admin") {
      const [workerResponse, assignmentResponse] = await Promise.all([
        api.workers.list(session.token),
        api.workers.assignmentsAll(session.token)
      ]);
      setWorkers(workerResponse.workers);
      setAssignments(assignmentResponse.assignments);
    }

    if (targetView === "duties") {
      const data = await api.workers.assignments(session.token);
      setAssignments(data.assignments);
    }

    if (targetView === "daily-log") {
      const data = await api.logs.list(session.token);
      setLogs(data.logs);
    }

    if (targetView === "contribution") {
      const data = await api.dashboard.workerContribution(session.token, contributionMonth);
      setWorkerContribution(data.contribution);
    }

    if (targetView === "crops" || targetView === "schedule") {
      const data = await api.crops.list(session.token);
      setCrops(data.crops);
    }

    if (targetView === "livestock" || targetView === "production") {
      const data = await api.livestock.list(session.token);
      setLivestock(data.livestock);
    }

    if (targetView === "education" || targetView === "learn") {
      const data = await api.education.list(session.token);
      setEducationPosts(data.posts);
    }

    if (targetView === "marketplace") {
      const data = await api.marketplace.list(session.token);
      setMarketplaceAds(data.ads);
    }
  }

  function persistSession(nextSession) {
    setSession(nextSession);
    window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
  }

  function clearSession(preserveQr = false) {
    setSession(null);
    setUser(null);
    setSummary(null);
    setMonthlyReport(null);
    setWorkerContribution(null);
    setFarms([]);
    setSignupRequests([]);
    setPackages([]);
    setWorkers([]);
    setAssignments([]);
    setCrops([]);
    setLivestock([]);
    setLogs([]);
    setEducationPosts([]);
    setMarketplaceAds([]);
    setFinanceEntries([]);
    setFinanceSummary({ income: 0, expense: 0, net: 0 });
    setMobileMenuOpen(false);
    window.localStorage.removeItem(sessionKey);
    if (!preserveQr) {
      clearPendingQr();
      setPendingQrTarget("");
      clearQrQueryFromLocation();
    }
  }

  function handleSwitchToWorker() {
    clearSession(true);
    setAuthMode("login");
    setNotice("QR target kept. Sign in with a worker account to continue.");
    setError("");
  }

  function handleDismissQrAccess() {
    clearSession();
    setAuthMode("login");
    setNotice("");
    setError("");
  }

  function handleViewChange(nextView) {
    setView(nextView);
    setMobileMenuOpen(false);
  }

  async function handleLogin(event) {
    event.preventDefault();
    await runTask(async () => {
      const response = await api.login(authForm);
      persistSession({ token: response.token });
      setAuthForm({ email: "", password: "" });
    });
  }

  async function handleSignup(event) {
    event.preventDefault();
    await runTask(async () => {
      await api.signupRequest(signupForm);
      setSignupForm({ name: "", email: "", password: "", farmName: "", location: "", landSize: "" });
      setNotice("Signup request submitted for creator approval.");
      setAuthMode("login");
    });
  }

  async function handleFarmCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      const formData = new FormData();
      formData.set("name", farmForm.name);
      formData.set("location", farmForm.location);
      formData.set("landSize", farmForm.landSize);
      if (farmForm.adminName && farmForm.adminEmail && farmForm.adminPassword) {
        formData.set("adminName", farmForm.adminName);
        formData.set("adminEmail", farmForm.adminEmail);
        formData.set("adminPassword", farmForm.adminPassword);
      }
      if (farmForm.logo) {
        formData.set("logo", await compressImageFile(farmForm.logo));
      }

      await api.farms.create(session.token, formData);
      setFarmForm({ name: "", location: "", landSize: "", adminName: "", adminEmail: "", adminPassword: "", logo: null });
      await refreshView("farms");
      setNotice("Farm created.");
    });
  }

  async function handleCreatePackage(event) {
    event.preventDefault();
    await runTask(async () => {
      await api.packages.create(session.token, packageForm);
      setPackageForm({ name: "", slug: "", priceMonthly: "", hasMarketplace: true, description: "" });
      await refreshView("packages");
      setNotice("Package created.");
    });
  }

  async function handleAssignPackage(farmId, packageId) {
    await runTask(async () => {
      await api.packages.assignToFarm(session.token, farmId, { packageId });
      await refreshView("packages");
      setNotice("Package assigned to farm.");
    });
  }

  async function handleClearFarmRecords(farmId) {
    await runTask(async () => {
      await api.farms.clearRecords(session.token, farmId);
      setNotice("Farm records cleared.");
    });
  }

  async function handleDeleteFarm(farmId) {
    await runTask(async () => {
      await api.farms.delete(session.token, farmId);
      await refreshView("farms");
      setNotice("Farm deleted.");
    });
  }

  async function handleApproveSignup(requestId) {
    await runTask(async () => {
      await api.signupRequests.approve(session.token, requestId);
      await refreshView("overview");
      setNotice("Signup approved.");
    });
  }

  async function handleRejectSignup(requestId) {
    await runTask(async () => {
      await api.signupRequests.reject(session.token, requestId);
      await refreshView("overview");
      setNotice("Signup rejected.");
    });
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    await runTask(async () => {
      await api.auth.changePassword(session.token, passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setNotice("Password changed.");
    });
  }

  async function handleWorkerCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      await api.workers.create(session.token, payrollForm);
      setPayrollForm({ name: "", duty: "", email: "", password: "", employmentStartDate: "", payRate: "", paymentStatus: "pending" });
      await refreshView("payroll");
      setNotice("Worker added.");
    });
  }

  function beginEditWorker(worker) {
    setEditingWorkerId(worker.id);
    setWorkerEditForm({
      name: worker.name || "",
      duty: worker.duty || "",
      email: worker.email || "",
      employmentStartDate: worker.employment_start_date || "",
      payRate: worker.pay_rate ?? "",
      paymentStatus: worker.payment_status || "pending"
    });
  }

  async function handleWorkerUpdate(event) {
    event.preventDefault();
    await runTask(async () => {
      await api.workers.update(session.token, editingWorkerId, workerEditForm);
      setEditingWorkerId("");
      await refreshView("payroll");
      setNotice("Worker updated.");
    });
  }

  async function handleAssignmentCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      await api.workers.assign(session.token, dutyAssignForm.workerId, dutyAssignForm);
      setDutyAssignForm({ workerId: "", title: "", description: "", dueDate: "" });
      await refreshView("duties-admin");
      setNotice("Duty assigned.");
    });
  }

  async function handleAssignmentStatus(workerId, assignmentId, status) {
    await runTask(async () => {
      await api.workers.updateAssignment(session.token, workerId, assignmentId, { status });
      await refreshView("duties-admin");
      setNotice("Duty updated.");
    });
  }

  async function handleCropCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      const formData = new FormData();
      formData.set("type", cropForm.type);
      formData.set("plantingDate", cropForm.plantingDate);
      formData.set("harvestDate", cropForm.harvestDate);
      formData.set("quantity", cropForm.quantity);
      formData.set("expectedYield", cropForm.expectedYield);
      if (cropForm.image) formData.set("image", await compressImageFile(cropForm.image));
      await api.crops.create(session.token, formData);
      setCropForm(emptyCropForm());
      await refreshView("crops");
      setNotice("Crop saved.");
    });
  }

  function beginEditCrop(crop) {
    setEditingCropId(crop.id);
    setCropEditForm({
      type: crop.type || "",
      plantingDate: toInputDate(crop.planting_date),
      harvestDate: toInputDate(crop.expected_harvest_date),
      quantity: crop.quantity ?? "",
      expectedYield: crop.expected_yield ?? "",
      image: null
    });
  }

  async function handleCropUpdate(event) {
    event.preventDefault();
    await runTask(async () => {
      const formData = new FormData();
      formData.set("type", cropEditForm.type);
      formData.set("plantingDate", cropEditForm.plantingDate);
      formData.set("harvestDate", cropEditForm.harvestDate);
      formData.set("quantity", cropEditForm.quantity);
      formData.set("expectedYield", cropEditForm.expectedYield);
      if (cropEditForm.image) formData.set("image", await compressImageFile(cropEditForm.image));
      await api.crops.update(session.token, editingCropId, formData);
      setEditingCropId("");
      setCropEditForm(emptyCropForm());
      await refreshView("crops");
      setNotice("Crop updated.");
    });
  }

  async function handleCropDelete(cropId) {
    await runTask(async () => {
      await api.crops.delete(session.token, cropId);
      if (editingCropId === cropId) {
        setEditingCropId("");
        setCropEditForm(emptyCropForm());
      }
      await refreshView("crops");
      setNotice("Crop deleted.");
    });
  }

  async function handleLivestockCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      const formData = new FormData();
      formData.set("type", livestockForm.type);
      formData.set("count", livestockForm.count);
      formData.set("productionMetric", livestockForm.productionMetric);
      formData.set("latestMetricValue", livestockForm.latestMetricValue);
      if (livestockForm.image) formData.set("image", await compressImageFile(livestockForm.image));
      await api.livestock.create(session.token, formData);
      setLivestockForm(emptyLivestockForm());
      await refreshView("livestock");
      setNotice("Livestock saved.");
    });
  }

  function beginEditLivestock(item) {
    setEditingLivestockId(item.id);
    setLivestockEditForm({
      type: item.type || "",
      count: item.count ?? "",
      productionMetric: item.production_metric || "",
      latestMetricValue: item.latest_metric_value ?? "",
      image: null
    });
  }

  async function handleLivestockUpdate(event) {
    event.preventDefault();
    await runTask(async () => {
      const formData = new FormData();
      formData.set("type", livestockEditForm.type);
      formData.set("count", livestockEditForm.count);
      formData.set("productionMetric", livestockEditForm.productionMetric);
      formData.set("latestMetricValue", livestockEditForm.latestMetricValue);
      if (livestockEditForm.image) formData.set("image", await compressImageFile(livestockEditForm.image));
      await api.livestock.update(session.token, editingLivestockId, formData);
      setEditingLivestockId("");
      setLivestockEditForm(emptyLivestockForm());
      await refreshView("livestock");
      setNotice("Livestock updated.");
    });
  }

  async function handleLivestockDelete(livestockId) {
    await runTask(async () => {
      await api.livestock.delete(session.token, livestockId);
      if (editingLivestockId === livestockId) {
        setEditingLivestockId("");
        setLivestockEditForm(emptyLivestockForm());
      }
      await refreshView("livestock");
      setNotice("Livestock deleted.");
    });
  }

  async function handleCropQrRegenerate(cropId) {
    await runTask(async () => {
      await api.crops.regenerateQr(session.token, cropId);
      await refreshView("crops");
      setNotice("Crop QR code regenerated. Old copies will no longer work.");
    });
  }

  async function handleLivestockQrRegenerate(livestockId) {
    await runTask(async () => {
      await api.livestock.regenerateQr(session.token, livestockId);
      await refreshView("livestock");
      setNotice("Livestock QR code regenerated. Old copies will no longer work.");
    });
  }

  async function handleEducationCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      const formData = new FormData();
      formData.set("title", educationForm.title);
      formData.set("body", educationForm.body);
      if (educationForm.image) formData.set("image", await compressImageFile(educationForm.image));
      await api.education.create(session.token, formData);
      setEducationForm({ title: "", body: "", image: null });
      await refreshView("education");
      setNotice("Guide published.");
    });
  }

  async function handleMarketplaceCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      const formData = new FormData();
      formData.set("title", marketplaceForm.title);
      formData.set("contactPerson", marketplaceForm.contactPerson);
      formData.set("location", marketplaceForm.location);
      formData.set("price", marketplaceForm.price);
      formData.set("phoneNumber", marketplaceForm.phoneNumber);
      if (marketplaceForm.image) formData.set("image", await compressImageFile(marketplaceForm.image));
      await api.marketplace.create(session.token, formData);
      setMarketplaceForm({ title: "", contactPerson: "", location: "", price: "", phoneNumber: "", image: null });
      await refreshView("marketplace");
      setNotice("Marketplace advert published.");
    });
  }

  async function handleFinanceCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      await api.finance.create(session.token, financeForm);
      setFinanceForm({ entryType: "expense", category: "", amount: "", entryDate: todayValue(), notes: "" });
      await refreshView("finance");
      setNotice("Finance entry saved.");
    });
  }

  async function handleProductionSubmit(event) {
    event.preventDefault();
    await runTask(async () => {
      await api.livestock.addUpdate(session.token, productionForm.livestockId, productionForm);
      setProductionForm({ livestockId: "", metricValue: "", metricUnit: "", notes: "" });
      setNotice("Production updated.");
    });
  }

  async function handleLogCreate(event) {
    event.preventDefault();
    await runTask(async () => {
      const parsedTargetPayload = parseQrPayloadInput(logForm.targetPayload);
      if (logForm.targetPayload.trim() && !parsedTargetPayload) {
        throw new Error("The scanned QR code is not valid. Paste the full crop or livestock QR link or payload.");
      }

      const formData = new FormData();
      formData.set("task", logForm.task);
      if (parsedTargetPayload) {
        formData.set("targetPayload", JSON.stringify(parsedTargetPayload));
        if (logForm.materialType && logForm.quantity && logForm.unit) {
          formData.set("recordType", logForm.recordType);
          formData.set("materialType", logForm.materialType);
          formData.set("quantity", logForm.quantity);
          formData.set("unit", logForm.unit);
          formData.set("recordNotes", logForm.recordNotes);
        }
      }
      const compressedLogImages = await compressImageFiles(logForm.images || []);
      compressedLogImages.forEach((file) => {
        formData.append("images", file);
      });

      await api.logs.create(session.token, formData);
      setLogForm({
        targetPayload: "",
        task: "",
        images: [],
        recordType: "input",
        materialType: "",
        quantity: "",
        unit: "",
        recordNotes: ""
      });
      await refreshView("daily-log");
      setNotice("Daily log submitted.");
    });
  }

  const editingWorker = workers.find((worker) => worker.id === editingWorkerId);

  if (!session?.token || !user) {
    if (qrAccessMode) {
      return (
        <div className="landing-shell qr-access-shell">
          <section className="landing-visual">
            <img alt="Farm worker in the field" src={heroImages[1]} />
            <img alt="Healthy farm produce" src={heroImages[0]} />
            <div className="landing-copy">
              <p className="eyebrow">Worker check-in</p>
              <h1>Scan accepted. This QR is tied to a farm task record.</h1>
              <p className="muted">Sign in with a worker account to record what was done for this crop or livestock target.</p>
            </div>
          </section>

          <section className="auth-card landing-card">
            <div className="qr-access-intro">
              <p className="eyebrow">QR target</p>
              <h2>{activeQrPayload?.label || "Farm task target"}</h2>
              <p className="muted">{activeQrPayload?.targetType === "livestock" ? "Livestock work log" : "Crop work log"}</p>
            </div>

            <form className="stack" onSubmit={handleLogin}>
              <Input label="Worker email" type="email" value={authForm.email} onChange={(value) => setAuthForm({ ...authForm, email: value })} />
              <Input label="Password" type="password" value={authForm.password} onChange={(value) => setAuthForm({ ...authForm, password: value })} />
              <button disabled={busy} type="submit">{busy ? "Please wait..." : "Continue to daily log"}</button>
            </form>

            {notice && <p className="success-text">{notice}</p>}
            {error && <p className="error">{error}</p>}
          </section>
        </div>
      );
    }

    return (
      <div className="landing-shell">
        <section className="landing-visual">
          <img alt="Happy landowner on the farm" src={heroImages[0]} />
          <img alt="Farm worker in the field" src={heroImages[1]} />
          <div className="landing-copy">
            <p className="eyebrow">Mkulima</p>
            <h1>Farm operations, payroll, packages, and sales in one calm workspace.</h1>
            <p className="muted">Log in to your farm portal or request approval for a new farm account.</p>
          </div>
        </section>

        <section className="auth-card landing-card">
          <div className="segmented two-up">
            <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")} type="button">Log in</button>
            <button className={authMode === "signup" ? "active" : ""} onClick={() => setAuthMode("signup")} type="button">Sign up</button>
          </div>

          {authMode === "login" ? (
            <form className="stack" onSubmit={handleLogin}>
              <Input label="Email" type="email" value={authForm.email} onChange={(value) => setAuthForm({ ...authForm, email: value })} />
              <Input label="Password" type="password" value={authForm.password} onChange={(value) => setAuthForm({ ...authForm, password: value })} />
              <button disabled={busy} type="submit">{busy ? "Please wait..." : "Continue"}</button>
            </form>
          ) : (
            <form className="stack" onSubmit={handleSignup}>
              <Input label="Full name" value={signupForm.name} onChange={(value) => setSignupForm({ ...signupForm, name: value })} />
              <Input label="Email" type="email" value={signupForm.email} onChange={(value) => setSignupForm({ ...signupForm, email: value })} />
              <Input label="Password" type="password" value={signupForm.password} onChange={(value) => setSignupForm({ ...signupForm, password: value })} />
              <Input label="Farm name" value={signupForm.farmName} onChange={(value) => setSignupForm({ ...signupForm, farmName: value })} />
              <Input label="Location" value={signupForm.location} onChange={(value) => setSignupForm({ ...signupForm, location: value })} />
              <Input label="Land size" type="number" value={signupForm.landSize} onChange={(value) => setSignupForm({ ...signupForm, landSize: value })} />
              <button disabled={busy} type="submit">{busy ? "Submitting..." : "Request approval"}</button>
            </form>
          )}

          {notice && <p className="success-text">{notice}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      </div>
    );
  }

  if (qrAccessMode && user.role !== "worker") {
    return (
      <div className="landing-shell qr-access-shell">
        <section className="landing-visual">
          <img alt="Farm worker checking crops" src={heroImages[1]} />
          <img alt="Farm produce" src={heroImages[0]} />
          <div className="landing-copy">
            <p className="eyebrow">Worker-only QR</p>
            <h1>This QR opens a worker daily log, not the admin workspace.</h1>
            <p className="muted">Use a worker account to submit work against the linked crop or livestock record.</p>
          </div>
        </section>

        <section className="auth-card landing-card">
          <div className="qr-access-intro">
            <p className="eyebrow">Signed in as</p>
            <h2>{user.name}</h2>
            <p className="muted">{user.role} access cannot submit QR-based worker logs.</p>
          </div>

          <div className="qr-summary">
            <strong>{activeQrPayload?.targetType === "livestock" ? "Livestock target" : "Crop target"}</strong>
            <span>{activeQrPayload?.label || "Farm task target"}</span>
          </div>

          <div className="button-row">
            <button onClick={handleSwitchToWorker} type="button">Sign in as worker</button>
            <button className="ghost-button" onClick={handleDismissQrAccess} type="button">Dismiss QR flow</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <button className={mobileMenuOpen ? "mobile-backdrop open" : "mobile-backdrop"} onClick={() => setMobileMenuOpen(false)} type="button" />

      <aside className={mobileMenuOpen ? "sidebar mobile-open" : "sidebar"}>
        <div className="brand-block">
          <p className="eyebrow">Mkulima</p>
          {user.farmLogoUrl ? <img alt={`${user.farmName || "Farm"} logo`} className="farm-logo" src={user.farmLogoUrl} /> : null}
          <h2>{user.farmName || "Creator workspace"}</h2>
          <p className="muted">{user.name} | {user.role}</p>
          {user.packageName && <p className="muted">Package: {user.packageName}</p>}
        </div>

        <nav className="nav-list">
          {views.map((item) => (
            <button className={view === item ? "nav-item active" : "nav-item"} key={item} onClick={() => handleViewChange(item)} type="button">
              {labelForView(item)}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="ghost-button" onClick={clearSession} type="button">Sign out</button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} type="button">Menu</button>
          <div>
            <h1>{labelForView(view)}</h1>
            <p className="muted">{error || notice || "Fast, simple control across farms, packages, and field operations."}</p>
          </div>
        </header>

        {view === "overview" && (
          <section className="page-grid overview-grid">
            <div className="stats-grid overview-stats">
              <StatCard label="Crops" value={summary?.metrics?.cropCount ?? summary?.totalCrops ?? 0} />
              <StatCard label="Livestock" value={summary?.metrics?.livestockCount ?? summary?.totalLivestock ?? 0} />
              <StatCard label="Workers" value={summary?.metrics?.workerCount ?? summary?.totalWorkers ?? 0} />
              <StatCard label="Yield" value={summary?.metrics?.expectedYieldTotal ?? summary?.expectedYield ?? 0} />
            </div>

            <Panel title={user.role === "creator" ? "Workspace" : "Farm summary"}>
              <div className="compact-details">
                {user.role === "creator" ? (
                  <>
                    <div className="detail-pair"><span>Farms</span><strong>{farms.length}</strong></div>
                    <div className="detail-pair"><span>Packages</span><strong>{packages.length}</strong></div>
                    <div className="detail-pair"><span>Pending approvals</span><strong>{signupRequests.length}</strong></div>
                    <div className="detail-pair"><span>Access</span><strong>Creator</strong></div>
                  </>
                ) : (
                  <>
                    <div className="detail-pair"><span>Farm</span><strong>{user.farmName || "Not assigned"}</strong></div>
                    <div className="detail-pair"><span>Package</span><strong>{user.packageName || "Free Plan"}</strong></div>
                    <div className="detail-pair"><span>Role</span><strong>{user.role}</strong></div>
                    <div className="detail-pair"><span>Workers</span><strong>{summary?.metrics?.workerCount ?? summary?.totalWorkers ?? 0}</strong></div>
                  </>
                )}
              </div>
            </Panel>

            <Panel title="Recent activity">
              {summary?.recentActivity?.length ? (
                <List
                  emptyLabel="No recent activity."
                  items={summary.recentActivity.map((item) => ({
                    title: item.worker_name || "Worker",
                    body: item.task,
                    meta: formatDateTime(item.created_at)
                  }))}
                />
              ) : (
                <p className="muted">No recent activity yet.</p>
              )}
            </Panel>

            {user.role === "creator" && (
              <Panel className="wide-panel" title="Pending approvals">
                {signupRequests.length ? signupRequests.map((request) => (
                  <article className="payroll-card" key={request.id}>
                    <div className="payroll-head">
                      <div>
                        <h4>{request.requested_name}</h4>
                        <p>{request.requested_farm_name}</p>
                      </div>
                      <span>{request.requested_email}</span>
                    </div>
                    <div className="button-row">
                      <button onClick={() => handleApproveSignup(request.id)} type="button">Approve</button>
                      <button className="ghost-button" onClick={() => handleRejectSignup(request.id)} type="button">Reject</button>
                    </div>
                  </article>
                )) : <p className="muted">No pending approvals.</p>}
              </Panel>
            )}
          </section>
        )}

        {view === "logs-admin" && (
          <Panel title="Worker daily logs">
            {logs.length ? (
              <div className="list">
                {logs.map((log) => (
                  <article className="log-card" key={log.id}>
                    <div className="log-head">
                      <strong>{log.worker_name} | {log.target_label || "General work"}</strong>
                      <span>{formatDateTime(log.created_at)}</span>
                    </div>
                    <p>{log.task}</p>
                    {log.activity_records?.length ? (
                      <div className="activity-strip">
                        {log.activity_records.map((record) => (
                          <span className="status-chip" key={record.id || `${record.materialType}-${record.unit}`}>
                            {record.materialType}: {record.quantity} {record.unit}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {log.images?.length ? (
                      <div className="image-strip">
                        {log.images.map((image) => (
                          <img key={image.id || image.url} alt="Worker upload" src={image.url || image} />
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No worker logs yet.</p>
            )}
          </Panel>
        )}

        {view === "monthly-report" && (
          <section className="page-grid two-column">
            <Panel title="Monthly report">
              <div className="stack">
                <label className="field">
                  <span>Month</span>
                  <input type="month" value={reportMonth} onChange={(event) => setReportMonth(event.target.value)} />
                </label>
                <div className="stats-grid report-stats">
                  <StatCard label="Logs" value={monthlyReport?.overview?.logCount ?? 0} />
                  <StatCard label="Active workers" value={monthlyReport?.overview?.activeWorkers ?? 0} />
                  <StatCard label="Income" value={monthlyReport?.overview?.income ?? 0} />
                  <StatCard label="Net" value={monthlyReport?.overview?.net ?? 0} />
                </div>
              </div>
            </Panel>
            <Panel title="Harvested produce">
              <List
                emptyLabel="No harvest records this month."
                items={(monthlyReport?.harvests || []).map((item) => ({
                  title: item.target_label || "Harvest",
                  body: "Harvested produce",
                  meta: `${item.total_quantity} ${item.unit}`
                }))}
              />
            </Panel>
            <Panel title="Farm inputs">
              <List
                emptyLabel="No input records this month."
                items={(monthlyReport?.inputs || []).map((item) => ({
                  title: item.material_type,
                  body: "Recorded through QR check-ins",
                  meta: `${item.total_quantity} ${item.unit}`
                }))}
              />
            </Panel>
            <Panel title="Livestock production">
              <List
                emptyLabel="No production updates this month."
                items={(monthlyReport?.production || []).map((item) => ({
                  title: item.livestock_type,
                  body: "Production total",
                  meta: `${item.total_metric}`
                }))}
              />
            </Panel>
            <Panel className="wide-panel" title="Recent monthly activity">
              <List
                emptyLabel="No activity captured this month."
                items={(monthlyReport?.recentLogs || []).map((item) => ({
                  title: `${item.worker_name} | ${item.target_label || "General work"}`,
                  body: item.task,
                  meta: formatDateTime(item.created_at)
                }))}
              />
            </Panel>
          </section>
        )}

        {view === "finance" && (
          <section className="page-grid two-column">
            <Panel title="Record income or expense">
              <form className="stack" onSubmit={handleFinanceCreate}>
                <SelectField label="Type" value={financeForm.entryType} onChange={(value) => setFinanceForm({ ...financeForm, entryType: value })} options={["expense", "income"]} />
                <Input label="Category" value={financeForm.category} onChange={(value) => setFinanceForm({ ...financeForm, category: value })} />
                <Input label="Amount" type="number" value={financeForm.amount} onChange={(value) => setFinanceForm({ ...financeForm, amount: value })} />
                <Input label="Entry date" type="date" value={financeForm.entryDate} onChange={(value) => setFinanceForm({ ...financeForm, entryDate: value })} />
                <TextArea label="Notes" required={false} value={financeForm.notes} onChange={(value) => setFinanceForm({ ...financeForm, notes: value })} />
                <button disabled={busy} type="submit">Save entry</button>
              </form>
            </Panel>
            <Panel title="Farm productivity">
              <div className="stack">
                <label className="field">
                  <span>Month</span>
                  <input type="month" value={financeMonth} onChange={(event) => setFinanceMonth(event.target.value)} />
                </label>
                <div className="stats-grid report-stats">
                  <StatCard label="Income" value={financeSummary.income} />
                  <StatCard label="Expense" value={financeSummary.expense} />
                  <StatCard label="Net" value={financeSummary.net} />
                </div>
                <p className={financeSummary.net >= 0 ? "success-text" : "error"}>
                  {financeSummary.net >= 0 ? "The farm is above cost for this period." : "The farm is currently spending more than it earns for this period."}
                </p>
              </div>
            </Panel>
            <Panel className="wide-panel" title="Finance entries">
              <List
                emptyLabel="No finance entries yet."
                items={financeEntries.map((entry) => ({
                  title: `${entry.entry_type} | ${entry.category}`,
                  body: entry.notes || "No notes",
                  meta: `${entry.amount} on ${formatDate(entry.entry_date)}`
                }))}
              />
            </Panel>
          </section>
        )}

        {view === "farms" && (
          <section className="page-grid two-column">
            <Panel title="Create farm">
              <form className="stack" onSubmit={handleFarmCreate}>
                <Input label="Farm name" value={farmForm.name} onChange={(value) => setFarmForm({ ...farmForm, name: value })} />
                <Input label="Location" value={farmForm.location} onChange={(value) => setFarmForm({ ...farmForm, location: value })} />
                <Input label="Land size" type="number" value={farmForm.landSize} onChange={(value) => setFarmForm({ ...farmForm, landSize: value })} />
                <label className="field"><span>Farm logo</span><input type="file" accept="image/*" onChange={(event) => setFarmForm({ ...farmForm, logo: event.target.files?.[0] || null })} /></label>
                <Input label="Admin name" required={false} value={farmForm.adminName} onChange={(value) => setFarmForm({ ...farmForm, adminName: value })} />
                <Input label="Admin email" required={false} type="email" value={farmForm.adminEmail} onChange={(value) => setFarmForm({ ...farmForm, adminEmail: value })} />
                <Input label="Admin password" required={false} type="password" value={farmForm.adminPassword} onChange={(value) => setFarmForm({ ...farmForm, adminPassword: value })} />
                <button disabled={busy} type="submit">Save farm</button>
              </form>
            </Panel>

            <Panel title="Farm controls">
              {farms.map((farm) => (
                <article className="payroll-card" key={farm.id}>
                  {farm.logo_url && <img alt={`${farm.name} logo`} className="farm-list-logo" src={farm.logo_url} />}
                  <div className="payroll-head">
                    <div>
                      <h4>{farm.name}</h4>
                      <p>{farm.location}</p>
                    </div>
                    <span>{farm.package_name || "No package"}</span>
                  </div>
                  <div className="button-row">
                    <button className="ghost-button" onClick={() => handleClearFarmRecords(farm.id)} type="button">Clear records</button>
                    <button onClick={() => handleDeleteFarm(farm.id)} type="button">Delete farm</button>
                  </div>
                </article>
              ))}
            </Panel>
          </section>
        )}

        {view === "packages" && (
          <section className="page-grid two-column">
            <Panel title="Create package">
              <form className="stack" onSubmit={handleCreatePackage}>
                <Input label="Name" value={packageForm.name} onChange={(value) => setPackageForm({ ...packageForm, name: value })} />
                <Input label="Slug" value={packageForm.slug} onChange={(value) => setPackageForm({ ...packageForm, slug: value })} />
                <Input label="Monthly price" type="number" value={packageForm.priceMonthly} onChange={(value) => setPackageForm({ ...packageForm, priceMonthly: value })} />
                <TextArea label="Description" required={false} value={packageForm.description} onChange={(value) => setPackageForm({ ...packageForm, description: value })} />
                <label className="field"><span>Includes marketplace</span><input type="checkbox" checked={packageForm.hasMarketplace} onChange={(event) => setPackageForm({ ...packageForm, hasMarketplace: event.target.checked })} /></label>
                <button disabled={busy} type="submit">Save package</button>
              </form>
            </Panel>

            <Panel title="Assign package to farm">
              {farms.map((farm) => (
                <article className="payroll-card" key={farm.id}>
                  <div className="payroll-head">
                    <div>
                      <h4>{farm.name}</h4>
                      <p>{farm.location}</p>
                    </div>
                    <span>{farm.package_name || "No package"}</span>
                  </div>
                  <div className="button-row">
                    {packages.map((pkg) => (
                      <button key={pkg.id} className="ghost-button" onClick={() => handleAssignPackage(farm.id, pkg.id)} type="button">{pkg.name}</button>
                    ))}
                  </div>
                </article>
              ))}
            </Panel>
          </section>
        )}

        {view === "payroll" && (
          <section className="page-grid two-column">
            <Panel title="Add worker to payroll">
              <form className="stack" onSubmit={handleWorkerCreate}>
                <Input label="Name" value={payrollForm.name} onChange={(value) => setPayrollForm({ ...payrollForm, name: value })} />
                <Input label="Duty" value={payrollForm.duty} onChange={(value) => setPayrollForm({ ...payrollForm, duty: value })} />
                <Input label="Email" type="email" value={payrollForm.email} onChange={(value) => setPayrollForm({ ...payrollForm, email: value })} />
                <Input label="Password" type="password" value={payrollForm.password} onChange={(value) => setPayrollForm({ ...payrollForm, password: value })} />
                <Input label="Started on" type="date" value={payrollForm.employmentStartDate} onChange={(value) => setPayrollForm({ ...payrollForm, employmentStartDate: value })} />
                <Input label="Pay amount" type="number" value={payrollForm.payRate} onChange={(value) => setPayrollForm({ ...payrollForm, payRate: value })} />
                <SelectField label="Payment status" value={payrollForm.paymentStatus} onChange={(value) => setPayrollForm({ ...payrollForm, paymentStatus: value })} options={paymentStatuses} />
                <button disabled={busy} type="submit">Create worker</button>
              </form>
            </Panel>
            <Panel title="Payroll roster">
              {editingWorker && (
                <form className="stack highlighted-form" onSubmit={handleWorkerUpdate}>
                  <h4>Edit {editingWorker.name}</h4>
                  <Input label="Name" value={workerEditForm.name} onChange={(value) => setWorkerEditForm({ ...workerEditForm, name: value })} />
                  <Input label="Duty" value={workerEditForm.duty} onChange={(value) => setWorkerEditForm({ ...workerEditForm, duty: value })} />
                  <Input label="Email" type="email" value={workerEditForm.email} onChange={(value) => setWorkerEditForm({ ...workerEditForm, email: value })} />
                  <Input label="Started on" type="date" value={workerEditForm.employmentStartDate} onChange={(value) => setWorkerEditForm({ ...workerEditForm, employmentStartDate: value })} />
                  <Input label="Pay amount" type="number" value={workerEditForm.payRate} onChange={(value) => setWorkerEditForm({ ...workerEditForm, payRate: value })} />
                  <SelectField label="Payment status" value={workerEditForm.paymentStatus} onChange={(value) => setWorkerEditForm({ ...workerEditForm, paymentStatus: value })} options={paymentStatuses} />
                  <button disabled={busy} type="submit">Save payroll</button>
                </form>
              )}
              {workers.map((worker) => (
                <article className="payroll-card" key={worker.id}>
                  <div className="payroll-head">
                    <div><h4>{worker.name}</h4><p>{worker.duty}</p></div>
                    <span>{worker.payment_status}</span>
                  </div>
                  <div className="detail-grid">
                    <span>Started: {formatDate(worker.employment_start_date)}</span>
                    <span>Pay: {worker.pay_rate}</span>
                    <span>{worker.email}</span>
                  </div>
                  <button className="ghost-button" onClick={() => beginEditWorker(worker)} type="button">Edit payroll</button>
                </article>
              ))}
            </Panel>
          </section>
        )}

        {view === "duties-admin" && (
          <section className="page-grid two-column">
            <Panel title="Assign a duty">
              <form className="stack" onSubmit={handleAssignmentCreate}>
                <label className="field">
                  <span>Worker</span>
                  <select value={dutyAssignForm.workerId} onChange={(event) => setDutyAssignForm({ ...dutyAssignForm, workerId: event.target.value })} required>
                    <option value="">Select worker</option>
                    {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
                  </select>
                </label>
                <Input label="Duty title" value={dutyAssignForm.title} onChange={(value) => setDutyAssignForm({ ...dutyAssignForm, title: value })} />
                <TextArea label="Duty details" value={dutyAssignForm.description} onChange={(value) => setDutyAssignForm({ ...dutyAssignForm, description: value })} />
                <Input label="Due date" type="date" required={false} value={dutyAssignForm.dueDate} onChange={(value) => setDutyAssignForm({ ...dutyAssignForm, dueDate: value })} />
                <button disabled={busy} type="submit">Assign duty</button>
              </form>
            </Panel>
            <Panel title="Duty status">
              {assignments.map((assignment) => (
                <article className="payroll-card" key={assignment.id}>
                  <div className="payroll-head">
                    <div><h4>{assignment.title}</h4><p>{assignment.worker_name}</p></div>
                    <span>{assignment.status}</span>
                  </div>
                  <p className="meta-line">{assignment.description}</p>
                  <div className="button-row">
                    {assignmentStatuses.map((status) => (
                      <button key={status} className="ghost-button" onClick={() => handleAssignmentStatus(assignment.worker_id, assignment.id, status)} type="button">{status}</button>
                    ))}
                  </div>
                </article>
              ))}
            </Panel>
          </section>
        )}

        {view === "crops" && (
          <section className="page-grid two-column">
            <Panel title="Add crop">
              <form className="stack" onSubmit={handleCropCreate}>
                <Input label="Type" value={cropForm.type} onChange={(value) => setCropForm({ ...cropForm, type: value })} />
                <Input label="Planting date" type="date" value={cropForm.plantingDate} onChange={(value) => setCropForm({ ...cropForm, plantingDate: value })} />
                <Input label="Expected harvest" type="date" value={cropForm.harvestDate} onChange={(value) => setCropForm({ ...cropForm, harvestDate: value })} />
                <Input label="Quantity planted" type="number" value={cropForm.quantity} onChange={(value) => setCropForm({ ...cropForm, quantity: value })} />
                <Input label="Expected yield" type="number" value={cropForm.expectedYield} onChange={(value) => setCropForm({ ...cropForm, expectedYield: value })} />
                <label className="field"><span>Crop image</span><input type="file" accept="image/*" onChange={(event) => setCropForm({ ...cropForm, image: event.target.files?.[0] || null })} /></label>
                <button disabled={busy} type="submit">Save crop</button>
              </form>
            </Panel>
            <Panel title="Crop targets">
              {editingCropId && (
                <form className="highlighted-form stack" onSubmit={handleCropUpdate}>
                  <Input label="Type" value={cropEditForm.type} onChange={(value) => setCropEditForm({ ...cropEditForm, type: value })} />
                  <Input label="Planting date" type="date" value={cropEditForm.plantingDate} onChange={(value) => setCropEditForm({ ...cropEditForm, plantingDate: value })} />
                  <Input label="Expected harvest" type="date" value={cropEditForm.harvestDate} onChange={(value) => setCropEditForm({ ...cropEditForm, harvestDate: value })} />
                  <Input label="Quantity planted" type="number" value={cropEditForm.quantity} onChange={(value) => setCropEditForm({ ...cropEditForm, quantity: value })} />
                  <Input label="Expected yield" type="number" value={cropEditForm.expectedYield} onChange={(value) => setCropEditForm({ ...cropEditForm, expectedYield: value })} />
                  <label className="field"><span>Replace crop image</span><input type="file" accept="image/*" onChange={(event) => setCropEditForm({ ...cropEditForm, image: event.target.files?.[0] || null })} /></label>
                  <div className="button-row">
                    <button disabled={busy} type="submit">Save crop changes</button>
                    <button className="ghost-button" onClick={() => setEditingCropId("")} type="button">Cancel</button>
                  </div>
                </form>
              )}
              <QrTargetList
                items={crops}
                emptyLabel="No crops yet."
                onEdit={beginEditCrop}
                onDelete={handleCropDelete}
                onRegenerate={user.role !== "worker" ? handleCropQrRegenerate : null}
                regeneratingDisabled={busy}
              />
            </Panel>
          </section>
        )}

        {view === "livestock" && (
          <section className="page-grid two-column">
            <Panel title="Add livestock">
              <form className="stack" onSubmit={handleLivestockCreate}>
                <Input label="Type" value={livestockForm.type} onChange={(value) => setLivestockForm({ ...livestockForm, type: value })} />
                <Input label="Count" type="number" value={livestockForm.count} onChange={(value) => setLivestockForm({ ...livestockForm, count: value })} />
                <SelectField label="Production metric" value={livestockForm.productionMetric} onChange={(value) => setLivestockForm({ ...livestockForm, productionMetric: value })} options={getMetricUnitOptions(livestockForm.type, "livestock", livestockForm.productionMetric)} />
                <Input label="Latest metric value" type="number" value={livestockForm.latestMetricValue} onChange={(value) => setLivestockForm({ ...livestockForm, latestMetricValue: value })} />
                <label className="field"><span>Animal image</span><input type="file" accept="image/*" onChange={(event) => setLivestockForm({ ...livestockForm, image: event.target.files?.[0] || null })} /></label>
                <button disabled={busy} type="submit">Save livestock</button>
              </form>
            </Panel>
            <Panel title="Livestock targets">
              {editingLivestockId && (
                <form className="highlighted-form stack" onSubmit={handleLivestockUpdate}>
                  <Input label="Type" value={livestockEditForm.type} onChange={(value) => setLivestockEditForm({ ...livestockEditForm, type: value })} />
                  <Input label="Count" type="number" value={livestockEditForm.count} onChange={(value) => setLivestockEditForm({ ...livestockEditForm, count: value })} />
                  <SelectField label="Production metric" value={livestockEditForm.productionMetric} onChange={(value) => setLivestockEditForm({ ...livestockEditForm, productionMetric: value })} options={getMetricUnitOptions(livestockEditForm.type, "livestock", livestockEditForm.productionMetric)} />
                  <Input label="Latest metric value" type="number" value={livestockEditForm.latestMetricValue} onChange={(value) => setLivestockEditForm({ ...livestockEditForm, latestMetricValue: value })} />
                  <label className="field"><span>Replace animal image</span><input type="file" accept="image/*" onChange={(event) => setLivestockEditForm({ ...livestockEditForm, image: event.target.files?.[0] || null })} /></label>
                  <div className="button-row">
                    <button disabled={busy} type="submit">Save livestock changes</button>
                    <button className="ghost-button" onClick={() => setEditingLivestockId("")} type="button">Cancel</button>
                  </div>
                </form>
              )}
              <QrTargetList
                items={livestock}
                emptyLabel="No livestock yet."
                onEdit={beginEditLivestock}
                onDelete={handleLivestockDelete}
                onRegenerate={user.role !== "worker" ? handleLivestockQrRegenerate : null}
                regeneratingDisabled={busy}
              />
            </Panel>
          </section>
        )}

        {view === "education" && (
          <section className="page-grid two-column">
            <Panel title="Publish guide">
              <form className="stack" onSubmit={handleEducationCreate}>
                <Input label="Title" value={educationForm.title} onChange={(value) => setEducationForm({ ...educationForm, title: value })} />
                <TextArea label="Guide" value={educationForm.body} onChange={(value) => setEducationForm({ ...educationForm, body: value })} />
                <label className="field"><span>Optional image</span><input type="file" accept="image/*" onChange={(event) => setEducationForm({ ...educationForm, image: event.target.files?.[0] || null })} /></label>
                <button disabled={busy} type="submit">Publish</button>
              </form>
            </Panel>
            <Panel title="Published guides"><EducationList posts={educationPosts} /></Panel>
          </section>
        )}

        {view === "marketplace" && (
          <section className="page-grid two-column">
            {(user.role === "creator" || user.role === "admin") && (
              <Panel title="Create advert">
                <form className="stack" onSubmit={handleMarketplaceCreate}>
                  <Input label="Advert title" value={marketplaceForm.title} onChange={(value) => setMarketplaceForm({ ...marketplaceForm, title: value })} />
                  <Input label="Contact person" value={marketplaceForm.contactPerson} onChange={(value) => setMarketplaceForm({ ...marketplaceForm, contactPerson: value })} />
                  <Input label="Location" value={marketplaceForm.location} onChange={(value) => setMarketplaceForm({ ...marketplaceForm, location: value })} />
                  <Input label="Price" type="number" value={marketplaceForm.price} onChange={(value) => setMarketplaceForm({ ...marketplaceForm, price: value })} />
                  <Input label="Phone number" value={marketplaceForm.phoneNumber} onChange={(value) => setMarketplaceForm({ ...marketplaceForm, phoneNumber: value })} />
                  <label className="field"><span>Advert image</span><input type="file" accept="image/*" onChange={(event) => setMarketplaceForm({ ...marketplaceForm, image: event.target.files?.[0] || null })} /></label>
                  <button disabled={busy} type="submit">Publish advert</button>
                </form>
              </Panel>
            )}
            <Panel title="Marketplace">
              {marketplaceAds.length ? marketplaceAds.map((ad) => (
                <article className="payroll-card" key={ad.id}>
                  {ad.image_url && <img alt={ad.title} className="entity-image" src={ad.image_url} />}
                  <div className="payroll-head">
                    <div><h4>{ad.title}</h4><p>{ad.farm_name}</p></div>
                    <span>{ad.price}</span>
                  </div>
                  <div className="detail-grid">
                    <span>Contact: {ad.contact_person}</span>
                    <span>Location: {ad.location}</span>
                    <span>Phone: {ad.phone_number}</span>
                  </div>
                </article>
              )) : <p className="muted">No marketplace adverts yet.</p>}
            </Panel>
          </section>
        )}

        {view === "daily-log" && (
          <section className="page-grid two-column">
            <Panel title="Submit daily log">
              <form className="stack" onSubmit={handleLogCreate}>
                <TextArea
                  label="Scanned QR payload"
                  required={false}
                  value={logForm.targetPayload}
                  onChange={(value) => setLogForm({ ...logForm, targetPayload: value })}
                />
                {logForm.targetPayload.trim() && (
                  <div className="qr-summary">
                    {parsedQrPayload ? (
                      <>
                        <strong>{parsedQrPayload.targetType === "livestock" ? "Livestock target" : "Crop target"}</strong>
                        <span>{parsedQrPayload.label || parsedQrPayload.targetId || "QR target ready"}</span>
                      </>
                    ) : (
                      <span className="error">Paste the full QR link or payload after scanning.</span>
                    )}
                  </div>
                )}
                <TextArea
                  label="Work done"
                  value={logForm.task}
                  onChange={(value) => setLogForm({ ...logForm, task: value })}
                />
                {parsedQrPayload ? (
                  <div className="highlighted-form stack">
                    <SelectField
                      label="Record type"
                      value={logForm.recordType}
                      onChange={(value) => setLogForm({
                        ...logForm,
                        recordType: value,
                        materialType: ""
                      })}
                      options={parsedQrPayload.targetType === "crop" ? ["input", "harvest"] : ["input"]}
                    />
                    <SelectField
                      label={logForm.recordType === "harvest" ? "Harvest type" : "Input type"}
                      value={logForm.materialType}
                      onChange={(value) => setLogForm({ ...logForm, materialType: value })}
                      options={logMaterialOptions}
                    />
                    <div className="form-split">
                      <Input label="Quantity" type="number" value={logForm.quantity} onChange={(value) => setLogForm({ ...logForm, quantity: value })} />
                      <SelectField label="Unit" value={logForm.unit} onChange={(value) => setLogForm({ ...logForm, unit: value })} options={logUnitOptions} />
                    </div>
                    <TextArea
                      label="Care or treatment notes"
                      required={false}
                      value={logForm.recordNotes}
                      onChange={(value) => setLogForm({ ...logForm, recordNotes: value })}
                    />
                  </div>
                ) : null}
                <label className="field">
                  <span>Images (up to 4)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setLogForm({ ...logForm, images: Array.from(event.target.files || []).slice(0, 4) })}
                  />
                </label>
                <button disabled={busy} type="submit">Submit daily log</button>
              </form>
            </Panel>
            <Panel title="Recent logs">
              {logs.length ? (
                <div className="list">
                  {logs.map((log) => (
                    <article className="log-card" key={log.id}>
                      <div className="log-head">
                        <strong>{log.target_label || "General work log"}</strong>
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                      <p>{log.task}</p>
                      {log.activity_records?.length ? (
                        <div className="activity-strip">
                          {log.activity_records.map((record) => (
                            <span className="status-chip" key={record.id || `${record.materialType}-${record.unit}`}>
                              {record.materialType}: {record.quantity} {record.unit}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {log.images?.length ? (
                        <div className="image-strip">
                          {log.images.map((image) => (
                            <img key={image.id || image.url} alt="Daily log attachment" src={image.url || image} />
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No daily logs submitted yet.</p>
              )}
            </Panel>
          </section>
        )}

        {view === "contribution" && (
          <section className="page-grid two-column">
            <Panel title="My contribution">
              <div className="stack">
                <label className="field">
                  <span>Month</span>
                  <input type="month" value={contributionMonth} onChange={(event) => setContributionMonth(event.target.value)} />
                </label>
                <div className="stats-grid report-stats">
                  <StatCard label="Logs submitted" value={workerContribution?.overview?.logsSubmitted ?? 0} />
                  <StatCard label="Completed duties" value={workerContribution?.overview?.completedAssignments ?? 0} />
                  <StatCard label="Total duties" value={workerContribution?.overview?.totalAssignments ?? 0} />
                </div>
              </div>
            </Panel>
            <Panel title="What I recorded">
              <List
                emptyLabel="No care or harvest records this month."
                items={(workerContribution?.activityBreakdown || []).map((item) => ({
                  title: `${item.material_type} | ${item.target_label || "Farm target"}`,
                  body: "Logged through QR check-in",
                  meta: `${item.total_quantity} ${item.unit}`
                }))}
              />
            </Panel>
            <Panel className="wide-panel" title="Recent work summaries">
              <List
                emptyLabel="No daily logs this month."
                items={(workerContribution?.recentLogs || []).map((item) => ({
                  title: item.target_label || "General work",
                  body: item.task,
                  meta: formatDateTime(item.created_at)
                }))}
              />
            </Panel>
          </section>
        )}

        {view === "duties" && (
          <Panel title="My duties">
            <List emptyLabel="No duties assigned." items={assignments.map((assignment) => ({ title: assignment.title, body: assignment.description, meta: assignment.status }))} />
          </Panel>
        )}

        {view === "schedule" && (
          <Panel title="Planting and harvest schedule">
            <List emptyLabel="No schedules available." items={crops.map((crop) => ({ title: crop.type, body: `Planted ${formatDate(crop.planting_date)}`, meta: `Harvest ${formatDate(crop.expected_harvest_date)}` }))} />
          </Panel>
        )}

        {view === "learn" && (
          <Panel title="Educational content"><EducationList posts={educationPosts} /></Panel>
        )}

        {view === "production" && (
          <section className="page-grid two-column">
            <Panel title="Log production update">
              <form className="stack" onSubmit={handleProductionSubmit}>
                <label className="field">
                  <span>Livestock record</span>
                  <select
                    value={productionForm.livestockId}
                    onChange={(event) => {
                      const nextItem = livestock.find((item) => item.id === event.target.value);
                      setProductionForm({
                        ...productionForm,
                        livestockId: event.target.value,
                        metricUnit: nextItem?.production_metric || getMetricUnitOptions(nextItem?.type || "", "livestock")[0] || ""
                      });
                    }}
                    required
                  >
                    <option value="">Select livestock</option>
                    {livestock.map((item) => <option key={item.id} value={item.id}>{item.type}</option>)}
                  </select>
                </label>
                <Input label="Metric value" type="number" value={productionForm.metricValue} onChange={(value) => setProductionForm({ ...productionForm, metricValue: value })} />
                <SelectField label="Metric unit" value={productionForm.metricUnit || selectedProductionItem?.production_metric || ""} onChange={(value) => setProductionForm({ ...productionForm, metricUnit: value })} options={productionUnitOptions} />
                <TextArea label="Notes" required={false} value={productionForm.notes} onChange={(value) => setProductionForm({ ...productionForm, notes: value })} />
                <button disabled={busy} type="submit">Submit update</button>
              </form>
            </Panel>
            <Panel title="Current production metrics">
              <List emptyLabel="No livestock data yet." items={livestock.map((item) => ({ title: item.type, body: `${item.count} animals`, meta: `${item.latest_metric_value} ${item.production_metric}` }))} />
            </Panel>
          </section>
        )}

        {view === "security" && (
          <Panel title="Change password">
            <form className="stack" onSubmit={handleChangePassword}>
              <Input label="Current password" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })} />
              <Input label="New password" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm({ ...passwordForm, newPassword: value })} />
              <button disabled={busy} type="submit">Update password</button>
            </form>
          </Panel>
        )}
      </main>
    </div>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <section className={`panel ${className}`.trim()}>
      <div className="panel-head"><h3>{title}</h3></div>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, type = "text", required = true }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function TextArea({ label, value, onChange, required = true }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows="4" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        {!value && <option value="">Select {label.toLowerCase()}</option>}
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function StatCard({ label, value }) {
  return <article className="stat-card"><p>{label}</p><strong>{value}</strong></article>;
}

function List({ items, emptyLabel }) {
  if (!items.length) return <p className="muted">{emptyLabel}</p>;
  return (
    <div className="list">
      {items.map((item, index) => (
        <article className="list-item" key={`${item.title}-${index}`}>
          <div><h4>{item.title}</h4><p>{item.body}</p></div>
          <span>{item.meta}</span>
        </article>
      ))}
    </div>
  );
}

function EducationList({ posts }) {
  if (!posts.length) return <p className="muted">No learning material yet.</p>;
  return (
    <div className="list">
      {posts.map((post) => (
        <article className="education-card" key={post.id}>
          <div className="log-head"><strong>{post.title}</strong><span>{formatDate(post.created_at)}</span></div>
          <p>{post.body}</p>
          {post.image_url && <img alt={post.title} src={post.image_url} />}
        </article>
      ))}
    </div>
  );
}

function QrTargetList({ items, emptyLabel, onEdit, onDelete, onRegenerate, regeneratingDisabled = false }) {
  if (!items.length) return <p className="muted">{emptyLabel}</p>;
  return (
    <div className="qr-grid">
      {items.map((item) => (
        <article className="qr-card" key={item.id}>
          <div className="log-head"><strong>{item.type}</strong><span>{item.count ? `${item.count} units` : `${item.quantity} planted`}</span></div>
          {item.image_url && <img alt={item.type} className="entity-image" src={item.image_url} />}
          <img alt={`${item.type} QR code`} src={item.qrCodeDataUrl} />
          {onRegenerate ? (
            <div className="button-row qr-actions">
              {onEdit ? (
                <button className="ghost-button" onClick={() => onEdit(item)} type="button">Edit</button>
              ) : null}
              {onDelete ? (
                <button className="ghost-button danger-button" onClick={() => onDelete(item.id)} type="button">Delete</button>
              ) : null}
              <button
                className="ghost-button"
                disabled={regeneratingDisabled}
                onClick={() => onRegenerate(item.id)}
                type="button"
              >
                Regenerate QR
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function labelForView(view) {
  const labels = {
    overview: "Overview",
    "logs-admin": "Worker Logs",
    "monthly-report": "Monthly Report",
    finance: "Finance",
    farms: "Farms",
    packages: "Packages",
    payroll: "Payroll",
    "duties-admin": "Worker Duties",
    "daily-log": "Daily Log",
    crops: "Crops",
    livestock: "Livestock",
    education: "Education",
    marketplace: "Marketplace",
    contribution: "My Contribution",
    duties: "My Duties",
    schedule: "Schedule",
    learn: "Learning",
    production: "Production",
    security: "Security"
  };
  return labels[view] || view;
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function getLogMaterialOptions(targetType, recordType) {
  if (recordType === "harvest") {
    return ["harvest"];
  }

  if (targetType === "livestock") {
    return ["feed", "water", "medicine"];
  }

  if (targetType === "crop") {
    return ["planting", "fertilizer", "water", "medicine"];
  }

  return ["general"];
}

function getMetricUnitOptions(label = "", targetType = "", existingUnit = "") {
  const normalized = `${label} ${targetType}`.toLowerCase();
  let preferred = [];

  if (normalized.includes("egg") || normalized.includes("chicken") || normalized.includes("hen") || normalized.includes("poultry")) {
    preferred = ["eggs", "trays", "crates"];
  } else if (normalized.includes("cow") || normalized.includes("milk") || normalized.includes("dairy")) {
    preferred = ["litres", "kg"];
  } else if (normalized.includes("goat")) {
    preferred = ["litres", "kg", "metres"];
  } else if (normalized.includes("maize") || normalized.includes("corn")) {
    preferred = ["kg", "bags"];
  } else if (targetType === "crop") {
    preferred = ["kg", "bags", "crates", "litres"];
  } else {
    preferred = defaultProductionUnits;
  }

  return Array.from(new Set([existingUnit, ...preferred, ...defaultProductionUnits].filter(Boolean)));
}

async function compressImageFiles(files, limit = 4) {
  const selectedFiles = Array.from(files || []).slice(0, limit);
  return Promise.all(selectedFiles.map((file) => compressImageFile(file)));
}

async function compressImageFile(file) {
  if (!file || !file.type?.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  if (file.size <= 700 * 1024) {
    return file;
  }

  const bitmap = await loadImageBitmap(file);
  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, "image/webp", 0.72);
  if (bitmap.close) {
    bitmap.close();
  }

  if (!blob || blob.size >= file.size) {
    return file;
  }

  const filename = file.name.replace(/\.[^.]+$/, "") || "upload";
  return new File([blob], `${filename}.webp`, { type: "image/webp" });
}

async function loadImageBitmap(file) {
  if ("createImageBitmap" in window) {
    return window.createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function resolveDefaultView(user, pendingQrTarget) {
  if (user?.role === "worker" && parseQrPayloadInput(pendingQrTarget)) {
    return "daily-log";
  }

  return getViews(user)[0] || "overview";
}

function readQrTargetFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  const currentUrl = new URL(window.location.href);
  const qrValue = currentUrl.searchParams.get("qr");
  if (!qrValue) {
    return "";
  }

  return decodeQrParam(qrValue) || qrValue;
}

function clearQrQueryFromLocation() {
  if (typeof window === "undefined") {
    return;
  }

  const currentUrl = new URL(window.location.href);
  if (!currentUrl.searchParams.has("qr")) {
    return;
  }

  currentUrl.searchParams.delete("qr");
  const nextPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
  window.history.replaceState({}, "", nextPath || "/");
}

function persistPendingQr(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(pendingQrKey, value);
}

function clearPendingQr() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(pendingQrKey);
}

function parseQrPayloadInput(value) {
  if (!value?.trim()) {
    return null;
  }

  const directPayload = tryParseQrPayloadObject(value);
  if (directPayload) {
    return directPayload;
  }

  const decodedParamPayload = tryParseQrPayloadObject(decodeQrParam(value));
  if (decodedParamPayload) {
    return decodedParamPayload;
  }

  try {
    const url = new URL(value);
    const qrValue = url.searchParams.get("qr");
    if (!qrValue) {
      return null;
    }

    return tryParseQrPayloadObject(decodeQrParam(qrValue)) || tryParseQrPayloadObject(qrValue);
  } catch {
    return null;
  }
}

function decodeQrParam(value) {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  const variants = [normalized];
  try {
    variants.push(decodeURIComponent(normalized));
  } catch {
    // Ignore malformed URI sequences and keep the raw value.
  }

  for (const variant of variants) {
    try {
      const padded = variant.replace(/-/g, "+").replace(/_/g, "/");
      const remainder = padded.length % 4;
      const base64 = remainder ? `${padded}${"=".repeat(4 - remainder)}` : padded;
      return window.atob(base64);
    } catch {
      // Keep trying fallbacks.
    }
  }

  return variants[variants.length - 1];
}

function tryParseQrPayloadObject(value) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed?.targetType || !parsed?.qrToken) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export default App;
