import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, Building2, House, Box, FileText, Monitor, Zap, Droplets,
  Wind, ClipboardCheck, AlertTriangle, ClipboardList, Wrench, BarChart3,
  Folder, Search, Bell, ChevronDown, ChevronLeft, Plus, Printer, CalendarDays,
  ArrowUpRight, ArrowDownRight, Clock3, CheckCircle2, CircleAlert, Menu,
  Settings, Users, Package, Wallet, X, Filter, MoreHorizontal, HardHat, Pencil, Trash2
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import './styles.css';

const menuGroups = [
  { label: 'ภาพรวม', items: [{ name: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'โครงการ', items: [{ name: 'โครงการทั้งหมด', icon: Building2 }, { name: 'แบบบ้าน', icon: House }] },
  { label: 'ออกแบบ', items: [{ name: 'Structure 3D', icon: Box }, { name: 'Blueprint', icon: FileText }, { name: 'CAD Viewer', icon: Monitor }] },
  { label: 'งานระบบ & อุปกรณ์', items: [{ name: 'ไฟฟ้า', icon: Zap }, { name: 'ประปา & สุขภัณฑ์', icon: Droplets }, { name: 'ปรับอากาศ', icon: Wind }, { name: 'อุปกรณ์อาคาร', icon: Settings }] },
  { label: 'งานปฏิบัติการ', items: [{ name: 'การตรวจสอบ', icon: ClipboardCheck }, { name: 'บิลเบิกจ่าย', icon: Wallet }, { name: 'ใบสั่งงาน', icon: ClipboardList }, { name: 'บำรุงรักษา', icon: Wrench }] },
  { label: 'ข้อมูล', items: [{ name: 'รายงาน', icon: BarChart3 }, { name: 'เอกสาร', icon: Folder }] }
];

const initialProjects = [
];

const PROJECTS_STORAGE_KEY = 'buildflow_projects';
const DISBURSEMENTS_STORAGE_KEY = 'buildflow_disbursements';

function loadDisbursements() {
  try {
    const saved = window.localStorage.getItem(DISBURSEMENTS_STORAGE_KEY);
    if (!saved) return [];
    const disbursements = JSON.parse(saved);
    return Array.isArray(disbursements) ? disbursements : [];
  } catch {
    return [];
  }
}

function localDateInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compressSlipImage(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('ไม่สามารถประมวลผลรูปภาพได้'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('ไม่สามารถแปลงรูปภาพได้'));
          return;
        }
        if (blob.size > 1_500_000) {
          reject(new Error('ไฟล์สลิปมีขนาดใหญ่เกินไป กรุณาใช้รูปที่มีขนาดเล็กลง'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('อ่านรูปภาพไม่สำเร็จ'));
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.8);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('ไฟล์นี้ไม่สามารถเปิดเป็นรูปภาพได้'));
    };
    image.src = imageUrl;
  });
}

function loadProjects() {
  try {
    const saved = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!saved) return initialProjects;
    const projects = JSON.parse(saved);
    return Array.isArray(projects) ? projects.map(project => {
      const contractAmount = typeof project.contractAmount === 'number'
        ? project.contractAmount
        : contractValue(project.value);
      const budgetAmount = typeof project.budgetAmount === 'number'
        ? project.budgetAmount
        : contractAmount;
      const disbursedAmount = typeof project.disbursedAmount === 'number'
        ? project.disbursedAmount
        : 0;
      return {
        ...project,
        contractAmount,
        budgetAmount,
        disbursedAmount,
        remainingBudget: budgetAmount - disbursedAmount
      };
    }) : initialProjects;
  } catch {
    return initialProjects;
  }
}

function contractValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[฿,\s]/g, '').replace(/[^\d.-]/g, '');
  return Number(cleaned) || 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(value);
}

function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  return Number(value.replace(/[฿,\s]/g, '').replace(/[^\d.-]/g, '')) || 0;
}

const trend = [];
const statusData = [];
function App() {
  const [active, setActive] = useState('Dashboard');
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState(loadProjects);
  const [disbursements, setDisbursements] = useState(loadDisbursements);
  const [showDisbursementCreate, setShowDisbursementCreate] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingDisbursement, setEditingDisbursement] = useState(null);
  const [slipDraft, setSlipDraft] = useState('');
  const [isSlipProcessing, setIsSlipProcessing] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [range, setRange] = useState('12 เดือน');
  const [toast, setToast] = useState('');
  const [budgetDraft, setBudgetDraft] = useState('');
  const [disbursedDraft, setDisbursedDraft] = useState('');
  const filteredProjects = useMemo(() => projects.filter(p => `${p.name} ${p.id} ${p.client}`.toLowerCase().includes(query.toLowerCase())), [projects, query]);

  useEffect(() => {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DISBURSEMENTS_STORAGE_KEY, JSON.stringify(disbursements));
    } catch {
      notify('บันทึกบิลไม่สำเร็จ พื้นที่จัดเก็บในเบราว์เซอร์อาจเต็ม');
    }
  }, [disbursements]);

  useEffect(() => {
    const syncProjects = (event) => {
      try {
        if (event.key === PROJECTS_STORAGE_KEY) {
          setProjects(event.newValue ? JSON.parse(event.newValue) : []);
        } else if (event.key === DISBURSEMENTS_STORAGE_KEY) {
          setDisbursements(event.newValue ? JSON.parse(event.newValue) : []);
        }
      } catch {
        if (event.key === PROJECTS_STORAGE_KEY) setProjects(initialProjects);
        if (event.key === DISBURSEMENTS_STORAGE_KEY) setDisbursements([]);
      }
    };
    window.addEventListener('storage', syncProjects);
    return () => window.removeEventListener('storage', syncProjects);
  }, []);

  const dashboardStats = useMemo(() => {
    const constructionStatuses = ['วางแผน', 'กำลังก่อสร้าง', 'รอตรวจรับ'];
    const totalContract = projects.reduce((sum, project) => (
      sum + (typeof project.contractAmount === 'number' ? project.contractAmount : contractValue(project.value))
    ), 0);
    const progress = projects.length
      ? projects.reduce((sum, project) => sum + (Number(project.progress) || 0), 0) / projects.length
      : 0;
    const delivered = projects.filter(project => project.status === 'ส่งมอบแล้ว').length;
    const backlog = projects
      .filter(project => project.status !== 'ส่งมอบแล้ว')
      .reduce((sum, project) => (
        sum + (typeof project.contractAmount === 'number' ? project.contractAmount : contractValue(project.value))
      ), 0);
    const totalBudget = projects.reduce((sum, project) => (
      sum + (typeof project.budgetAmount === 'number' ? project.budgetAmount : (typeof project.contractAmount === 'number' ? project.contractAmount : contractValue(project.value)))
    ), 0);
    const totalDisbursed = projects.reduce((sum, project) => (
      sum + (typeof project.disbursedAmount === 'number' ? project.disbursedAmount : 0)
    ), 0);
    const remainingBudget = projects.reduce((sum, project) => {
      const budget = typeof project.budgetAmount === 'number'
        ? project.budgetAmount
        : (typeof project.contractAmount === 'number' ? project.contractAmount : contractValue(project.value));
      const disbursed = typeof project.disbursedAmount === 'number' ? project.disbursedAmount : 0;
      return sum + (budget - disbursed);
    }, 0);
    const statusCounts = ['วางแผน', 'กำลังก่อสร้าง', 'รอตรวจรับ', 'ส่งมอบแล้ว'].map(status => ({
      status,
      count: projects.filter(project => project.status === status).length
    }));
    return {
      constructionCount: projects.filter(project => constructionStatuses.includes(project.status)).length,
      totalContract,
      progress,
      delivered,
      backlog,
      totalBudget,
      totalDisbursed,
      remainingBudget,
      statusCounts
    };
  }, [projects]);

  const latestDisbursements = useMemo(() => disbursements
    .slice(-4)
    .reverse()
    .map(bill => {
      const project = projects.find(item => item.id === bill.projectId);
      return {
        ...bill,
        project: project?.name || bill.projectName,
        remaining: project ? (project.budgetAmount || 0) - (project.disbursedAmount || 0) : 0
      };
    }), [disbursements, projects]);

  const notify = (msg) => { setToast(msg); window.setTimeout(() => setToast(''), 2600); };
  const openCreate = () => {
    setEditingProject(null);
    setBudgetDraft('');
    setDisbursedDraft('0');
    setShowCreate(true);
  };
  const openEdit = (project) => {
    setEditingProject(project);
    setBudgetDraft(String(project.budgetAmount ?? project.contractAmount ?? 0));
    setDisbursedDraft(String(project.disbursedAmount ?? 0));
    setShowCreate(true);
  };
  const closeProjectModal = () => {
    setShowCreate(false);
    setEditingProject(null);
    setBudgetDraft('');
    setDisbursedDraft('');
  };
  const openDisbursementCreate = () => {
    setEditingDisbursement(null);
    setSlipDraft('');
    setShowDisbursementCreate(true);
  };
  const openDisbursementEdit = (bill) => {
    setEditingDisbursement(bill);
    setSlipDraft(bill.slipDataUrl || '');
    setShowDisbursementCreate(true);
  };
  const closeDisbursementModal = () => {
    setShowDisbursementCreate(false);
    setEditingDisbursement(null);
    setSlipDraft('');
  };
  const handleSlipUpload = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      input.value = '';
      notify('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    if (file.size > 12_000_000) {
      input.value = '';
      notify('ไฟล์ต้นฉบับมีขนาดใหญ่เกินไป (สูงสุด 12 MB)');
      return;
    }
    setIsSlipProcessing(true);
    try {
      setSlipDraft(await compressSlipImage(file));
    } catch (error) {
      input.value = '';
      notify(error instanceof Error ? error.message : 'อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setIsSlipProcessing(false);
    }
  };
  const saveDisbursement = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const projectId = form.get('projectId');
    const amount = parseAmount(form.get('amount'));
    const project = projects.find(item => item.id === projectId);
    if (!project || amount <= 0) {
      notify('กรุณาเลือกโครงการและระบุยอดเบิกจ่ายให้ถูกต้อง');
      return;
    }

    const bill = {
      id: editingDisbursement?.id || `BL-${Date.now()}`,
      projectId: project.id,
      projectName: project.name,
      amount,
      reference: String(form.get('reference') || '').trim(),
      date: String(form.get('date') || ''),
      slipDataUrl: slipDraft
    };
    setDisbursements(current => editingDisbursement
      ? current.map(item => item.id === editingDisbursement.id ? bill : item)
      : [...current, bill]);
    setProjects(current => current.map(item => {
      let change = 0;
      if (editingDisbursement?.projectId === item.id) change -= Number(editingDisbursement.amount) || 0;
      if (project.id === item.id) change += amount;
      if (change === 0) return item;
      const disbursedAmount = Math.max(0, (Number(item.disbursedAmount) || 0) + change);
      const budgetAmount = Number(item.budgetAmount) || 0;
      return { ...item, disbursedAmount, remainingBudget: budgetAmount - disbursedAmount };
    }));
    closeDisbursementModal();
    notify(editingDisbursement ? 'แก้ไขบิลเบิกจ่ายเรียบร้อย' : 'เพิ่มบิลเบิกจ่ายเรียบร้อย');
  };
  const deleteProject = (project) => {
    if (!window.confirm(`ยืนยันการลบโครงการ "${project.name}" หรือไม่?`)) return;
    setProjects(current => current.filter(p => p.id !== project.id));
    notify('ลบโครงการเรียบร้อย');
  };
  const saveProject = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = form.get('name').trim();
    const client = form.get('client').trim();
    const value = form.get('value').trim();
    const progress = Number(form.get('progress'));
    const status = form.get('status');
    const date = form.get('date') || '';
    const contractAmount = contractValue(value);
    const budgetInput = form.get('budget');
    const budgetAmount = budgetInput?.trim() ? parseAmount(budgetInput) : contractAmount;
    const disbursedAmount = parseAmount(form.get('disbursed'));
    const controlledBudget = Math.max(budgetAmount, 0);
    const controlledDisbursement = Math.min(Math.max(disbursedAmount, 0), controlledBudget);

    if (editingProject) {
      setProjects(current => current.map(p => p.id === editingProject.id ? {
        ...p, name, client,
        value: value ? `฿${formatMoney(contractAmount)}` : p.value,
        contractAmount: value ? contractAmount : (typeof p.contractAmount === 'number' ? p.contractAmount : contractValue(p.value)),
        budgetAmount: controlledBudget,
        disbursedAmount: controlledDisbursement,
        remainingBudget: controlledBudget - controlledDisbursement,
        progress, status,
        date: date ? new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`)) : p.date
      } : p));
      notify('แก้ไขโครงการเรียบร้อย');
    } else {
      const nextNumber = projects.length + 1;
      const id = `PRJ-2026-${String(nextNumber).padStart(3, '0')}`;
      setProjects(current => [...current, {
        id, name, client, progress, status,
        value: value ? `฿${formatMoney(contractAmount)}` : '฿0',
        contractAmount,
        budgetAmount: controlledBudget,
        disbursedAmount: controlledDisbursement,
        remainingBudget: controlledBudget - controlledDisbursement,
        date: date ? new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`)) : '-'
      }]);
      notify('เพิ่มโครงการเรียบร้อย');
    }
    closeProjectModal();
  };
  const pageTitle = active === 'Dashboard' ? 'Dashboard' : active;
  const isDashboard = active === 'Dashboard';

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><House size={22} strokeWidth={2.5}/></div>
        <div className="brand-copy"><strong>BALAMEE BUILDING</strong><span>BUILD · INSPECT · CARE</span></div>
        <button className="collapse-btn" onClick={() => setMobileOpen(false)} aria-label="ปิดเมนู"><ChevronLeft size={17}/></button>
      </div>
      <nav className="side-nav">
        {menuGroups.map(group => <section className="nav-group" key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map(item => <button key={item.name} onClick={() => { setActive(item.name === 'ภาพรวม' ? 'Dashboard' : item.name); setMobileOpen(false); }} className={`nav-item ${active === item.name || (active === 'Dashboard' && item.name === 'Dashboard') ? 'selected' : ''}`}>
            <item.icon size={17}/><span>{item.name}</span>{item.count && <em>{item.count}</em>}
          </button>)}
        </section>)}
      </nav>
      <div className="support-card"><div className="support-icon"><HardHat size={17}/></div><div><small>สายด่วนบริการ · คุณ บารมี (ยู)</small><strong>083-012-2211</strong></div></div>
      <div className="sidebar-user"><div className="avatar">ก</div><div><strong>ผู้ดูแลระบบ</strong><small>Administrator</small></div><span className="online-dot"/></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20}/></button>
        <div className="breadcrumb"><span>ภาพรวม</span><strong>{pageTitle}</strong></div>
        <div className="top-actions">
          <div className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาโครงการ แจ้งซ่อม หรืออุปกรณ์..."/><kbd>Ctrl K</kbd></div>
          <div className="popover-wrap">
            <button className="icon-btn notification-btn" onClick={() => {setShowNotifications(!showNotifications);setShowProfile(false)}}><Bell size={18}/></button>
            {showNotifications && <div className="popover notification-pop"><strong>การแจ้งเตือน</strong><p><b>ไม่มีการแจ้งเตือนใหม่</b><small>ข้อมูลยังว่าง</small></p></div>}
          </div>
          <div className="popover-wrap">
            <button className="profile-btn" onClick={() => {setShowProfile(!showProfile);setShowNotifications(false)}}><div className="avatar small">ก</div><span>ผู้ดูแลระบบ</span><ChevronDown size={14}/></button>
            {showProfile && <div className="popover profile-pop"><strong>ผู้ดูแลระบบ</strong><small>admin@homecraft.co.th</small><button onClick={() => notify('เปิดหน้าตั้งค่าบัญชี')}>ตั้งค่าบัญชี</button><button onClick={() => notify('ออกจากระบบ (ตัวอย่าง)')}>ออกจากระบบ</button></div>}
          </div>
        </div>
      </header>

      <div className="content">
        <div className="page-heading">
          <div>
            <div className="date-line"><CalendarDays size={15}/> วันพุธที่ 25 พฤศจิกายน พ.ศ. 2569</div>
            <h1>{isDashboard ? <>สวัสดีตอนเช้า, <span>ผู้ดูแลระบบ</span></> : pageTitle}</h1>
            <p className="subheading"><Building2 size={14}/> BALAMEE BUILDING <span>·</span> <Users size={14}/> กำลังก่อสร้าง {dashboardStats.constructionCount} โครงการ <span>·</span> <CheckCircle2 size={14}/> อยู่ในระยะรับประกัน {dashboardStats.delivered} หลัง</p>
          </div>
          <div className="heading-actions">
            <button className="btn btn-light" onClick={() => window.print()}><Printer size={16}/> พิมพ์สรุป</button>
            <button className="btn btn-light" onClick={() => setActive('บิลเบิกจ่าย')}><Wallet size={16}/> บิลเบิกจ่าย</button>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={17}/> สร้างโครงการ</button>
          </div>
        </div>

        {isDashboard ? <>
          <section className="kpi-grid">
            <KpiCard icon={<Building2/>} tone="blue" label="โครงการที่กำลังก่อสร้าง" value={String(dashboardStats.constructionCount)} unit="โครงการ" note={projects.length ? `${projects.length} โครงการทั้งหมด` : 'ยังไม่มีข้อมูลโครงการ'}/>
            <KpiCard icon={<Wallet/>} tone="amber" label="มูลค่าสัญญาปี 2569" value={`฿${formatMoney(dashboardStats.totalContract / 1000000)}`} unit="ล้านบาท" note={projects.length ? `${projects.length} โครงการ` : 'ยังไม่มีข้อมูลสัญญา'}/>
            <div className="kpi-card">
              <div className="kpi-top"><div className="kpi-icon green"><ArrowUpRight size={18}/></div><span className="kpi-label">ความคืบหน้าเฉลี่ย vs แผน</span></div>
              <div className="kpi-value">{dashboardStats.progress.toFixed(0)}% <small>แผน 0%</small></div><div className="kpi-note">{projects.length ? 'จากโครงการทั้งหมด' : 'ยังไม่มีข้อมูลความคืบหน้า'}</div>
              <div className="progress-track"><div className="progress-fill" style={{width:`${dashboardStats.progress}%`}}/><span className="plan-marker" style={{left:'0%'}}/></div>
              <div className="legend-inline"><span><i className="dot blue-dot"/> จริง</span><span><i className="dot gray-dot"/> แผน</span><span><i className="dot dark-dot"/> เป้าหมายวันนี้</span></div>
            </div>
            <KpiCard icon={<House/>} tone="mint" label="บ้านที่ส่งมอบแล้ว" value={String(dashboardStats.delivered)} unit="หลัง" note={dashboardStats.delivered ? 'อัปเดตจากข้อมูลโครงการ' : 'ยังไม่มีข้อมูลการส่งมอบ'}/>
            <div className="kpi-card repair-kpi">
              <div className="kpi-top"><div className="kpi-icon rose"><Wrench size={18}/></div><span className="kpi-label">แจ้งซ่อมที่เปิดอยู่</span></div>
              <div className="kpi-value">0 <small>เรื่อง</small></div><div className="kpi-note">ยังไม่มีงานแจ้งซ่อม</div>
              <div className="sla-row"><span>อยู่ในกำหนด SLA</span><b>0%</b></div><div className="sla-track"><span style={{width:'0%'}}/></div>
            </div>
            <KpiCard icon={<ClipboardCheck/>} tone="cyan" label="การตรวจ 30 วันล่าสุด" value="0" unit="ครั้ง" note="ยังไม่มีข้อมูลการตรวจสอบ"/>
            <div className="kpi-card">
              <div className="kpi-top"><div className="kpi-icon gold"><span className="star">★</span></div><span className="kpi-label">ความพึงพอใจลูกค้า</span></div>
              <div className="kpi-value">0<small> / 5</small></div><div className="stars"><span>ยังไม่มีข้อมูลการประเมิน</span></div>
            </div>
            <div className="kpi-card">
              <div className="kpi-top"><div className="kpi-icon purple"><Package size={18}/></div><span className="kpi-label">มูลค่างานในมือ (Backlog)</span></div>
              <div className="kpi-value">฿{formatMoney(dashboardStats.backlog / 1000000)} <small>ล้านบาท</small></div><div className="kpi-note">{dashboardStats.backlog ? 'งานที่ยังไม่ส่งมอบ' : 'ยังไม่มีงานในมือ'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-top"><div className="kpi-icon amber"><Wallet size={18}/></div><span className="kpi-label">งบประมาณ / เบิกจ่าย</span></div>
              <div className="kpi-value">฿{formatMoney(dashboardStats.totalDisbursed / 1000000)} <small>จาก ฿{formatMoney(dashboardStats.totalBudget / 1000000)} ล้านบาท</small></div>
              <div className="kpi-note">คงเหลือ ฿{formatMoney(dashboardStats.remainingBudget / 1000000)} ล้านบาท</div>
              <div className="progress-track"><div className="progress-fill" style={{width:`${dashboardStats.totalBudget ? Math.min(dashboardStats.totalDisbursed / dashboardStats.totalBudget * 100, 100) : 0}%`}}/></div>
            </div>
          </section>

          <section className="analytics-grid">
            <div className="panel trend-panel">
              <div className="panel-header"><div className="panel-title"><div className="panel-icon"><BarChart3 size={17}/></div><div><h2>มูลค่าสัญญา & การส่งมอบบ้าน</h2><p>24 เดือนล่าสุด · ล้านบาท (นับตามเดือนเริ่มก่อสร้าง)</p></div></div><div className="panel-controls"><select value={range} onChange={e=>setRange(e.target.value)}><option>12 เดือน</option><option>24 เดือน</option><option>ปีนี้</option></select><button className="dots-btn" onClick={() => notify('ตัวเลือกกราฟ') }><MoreHorizontal size={18}/></button></div></div>
              <div className="chart-summary"><div><small>มูลค่าสัญญา 24 เดือน</small><strong>฿{formatMoney(dashboardStats.totalContract / 1000000)} ล้าน</strong></div><div><small>จำนวนสัญญา</small><strong>{projects.length} โครงการ</strong></div><div><small>มูลค่าเฉลี่ย/สัญญา</small><strong>฿{formatMoney(projects.length ? dashboardStats.totalContract / projects.length / 1000000 : 0)} ล้าน</strong></div><div><small>ส่งมอบ 24 เดือน</small><strong>{dashboardStats.delivered} หลัง</strong></div></div>
              <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={range === '12 เดือน' ? trend : [...trend,...trend]} margin={{top:8,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#edf0f4"/><XAxis dataKey="month" tick={{fontSize:10,fill:'#929ba8'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#929ba8'}} axisLine={false} tickLine={false} tickFormatter={v=>`฿${v}m`}/><Tooltip formatter={(v,n)=>[`฿${v} ล้าน`,n==='contract'?'มูลค่าสัญญา':'ส่งมอบ']}/><Bar dataKey="contract" fill="#2787b0" radius={[4,4,0,0]} barSize={18}/><Area dataKey="delivered" stroke="#c49b5a" fill="none"/></BarChart></ResponsiveContainer></div>
              <div className="chart-legend"><span><i className="legend-square"/> มูลค่าสัญญา</span><span><i className="legend-line"/> ค่าเฉลี่ย 12 เดือน</span><span><i className="legend-green"/> ส่งมอบ</span></div>
            </div>
            <div className="panel status-panel">
              <div className="panel-header"><div className="panel-title"><div className="panel-icon"><Clock3 size={17}/></div><div><h2>สถานะโครงการ</h2><p>{projects.length ? 'อัปเดตตามโครงการล่าสุด' : 'ยังไม่มีข้อมูลโครงการ'}</p></div></div><button className="text-link" onClick={() => setActive('โครงการทั้งหมด')}>ทั้งหมด <ArrowUpRight size={14}/></button></div>
              <div className="donut-wrap" style={{background: projects.length ? `conic-gradient(#64748b 0 ${dashboardStats.statusCounts[0].count / projects.length * 100}%, #c69a3b ${dashboardStats.statusCounts[0].count / projects.length * 100}% ${(dashboardStats.statusCounts[0].count + dashboardStats.statusCounts[1].count) / projects.length * 100}%, #2787b0 ${(dashboardStats.statusCounts[0].count + dashboardStats.statusCounts[1].count) / projects.length * 100}% ${(dashboardStats.statusCounts[0].count + dashboardStats.statusCounts[1].count + dashboardStats.statusCounts[2].count) / projects.length * 100}%, #1aae7d ${(dashboardStats.statusCounts[0].count + dashboardStats.statusCounts[1].count + dashboardStats.statusCounts[2].count) / projects.length * 100}% 100%)` : '#edf0f3'}}><div className="donut-center"><strong>{projects.length}</strong><span>โครงการ</span></div></div>
              <div className="status-list">
                {[
                  ['วางแผน', '#64748b'],
                  ['กำลังก่อสร้าง', '#c69a3b'],
                  ['รอตรวจรับ', '#2787b0'],
                  ['ส่งมอบแล้ว', '#1aae7d']
                ].map(([status, color]) => {
                  const count = dashboardStats.statusCounts.find(item => item.status === status)?.count || 0;
                  return <div key={status}><span><i style={{background: color}}/> {status}</span><b>{count}</b><small>{projects.length ? `${Math.round(count / projects.length * 100)}%` : '0%'}</small></div>;
                })}
              </div>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="panel projects-panel">
              <div className="panel-header"><div className="panel-title"><div className="panel-icon"><Building2 size={17}/></div><div><h2>โครงการล่าสุด</h2><p>ติดตามสถานะและความคืบหน้าของโครงการ</p></div></div><button className="text-link" onClick={()=>setActive('โครงการทั้งหมด')}>ดูทั้งหมด <ArrowUpRight size={14}/></button></div>
              <ProjectTable rows={filteredProjects.slice(0,4)} onEdit={openEdit} onDelete={deleteProject}/>
            </div>
            <div className="panel repairs-panel">
              <div className="panel-header"><div className="panel-title"><div className="panel-icon"><Wallet size={17}/></div><div><h2>บิลเบิกจ่ายล่าสุด</h2><p>รายการเบิกจ่ายโครงการล่าสุด</p></div></div><button className="text-link" onClick={()=>setActive('โครงการทั้งหมด')}>ดูทั้งหมด <ArrowUpRight size={14}/></button></div>
              <div className="repair-list">
                {latestDisbursements.length ? latestDisbursements.map(bill =>
                  <div className="repair-item" key={bill.id}>
                    <div className="repair-symbol"><Wallet size={16}/></div>
                    <div className="repair-detail"><strong>{bill.project}</strong><small>{bill.id} · {bill.date}</small><span>คงเหลือ ฿{formatMoney(bill.remaining)}</span></div>
                    <em className="normal">฿{formatMoney(bill.amount)}</em>
                  </div>
                ) : <div className="no-results">ยังไม่มีบิลเบิกจ่าย</div>}
              </div>
            </div>
          </section>
        </> : <section className="panel module-panel">
          <div className="module-toolbar"><div><h2>{active}</h2><p>จัดการข้อมูลและติดตามการดำเนินงานในระบบ ERP</p></div><div className="module-actions"><button className="btn btn-light" onClick={()=>notify('เปิดตัวกรองข้อมูล')}><Filter size={15}/> ตัวกรอง</button><button className="btn btn-primary" disabled={active === 'บิลเบิกจ่าย' && projects.length === 0} onClick={active === 'บิลเบิกจ่าย' ? openDisbursementCreate : openCreate}><Plus size={16}/> {active === 'บิลเบิกจ่าย' ? 'เพิ่มบิลเบิกจ่าย' : 'เพิ่มรายการ'}</button></div></div>
          {active === 'บิลเบิกจ่าย'
            ? projects.length
              ? <DisbursementTable rows={disbursements.slice().reverse()} projects={projects} onEdit={openDisbursementEdit}/>
              : <div className="empty-module"><div className="empty-icon"><Wallet size={28}/></div><h3>ยังไม่มีโครงการสำหรับเบิกจ่าย</h3><p>เพิ่มโครงการก่อน แล้วจึงบันทึกบิลเบิกจ่ายได้</p><button className="btn btn-primary" onClick={() => setActive('โครงการทั้งหมด')}><Plus size={16}/> ไปที่โครงการ</button></div>
            : active.includes('โครงการ') ? <ProjectTable rows={filteredProjects} onEdit={openEdit} onDelete={deleteProject}/> : <div className="empty-module"><div className="empty-icon"><ClipboardList size={28}/></div><h3>พื้นที่จัดการ{active}</h3><p>หน้านี้เตรียมโครงสร้างไว้สำหรับพัฒนาฟังก์ชัน {active} เพิ่มเติม</p><button className="btn btn-primary" onClick={()=>notify(`เริ่มเพิ่มข้อมูล${active}`)}><Plus size={16}/> สร้างรายการแรก</button></div>}
        </section>}
        <footer className="footer"><span>© 2026 BALAMEE BUILDING ERP</span><span>BuildFlow ERP <b>v1.0.0</b></span></footer>
      </div>
    </main>

    {showCreate && <div className="modal-backdrop" onClick={closeProjectModal}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{editingProject ? 'แก้ไขโครงการ' : 'สร้างโครงการใหม่'}</h2><p>{editingProject ? 'ปรับปรุงข้อมูลโครงการที่เลือก' : 'กรอกข้อมูลเบื้องต้นเพื่อเพิ่มโครงการเข้าสู่ระบบ'}</p></div><button className="icon-btn" onClick={closeProjectModal}><X size={19}/></button></div><form onSubmit={saveProject}>
      <label>ชื่อโครงการ<input name="name" required defaultValue={editingProject?.name || ''} placeholder="เช่น บ้านพักอาศัย 2 ชั้น"/></label>
      <div className="form-row"><label>ชื่อลูกค้า<input name="client" required defaultValue={editingProject?.client || ''} placeholder="ชื่อ-นามสกุล / บริษัท"/></label><label>มูลค่าสัญญา<input name="value" defaultValue={editingProject?.value?.replace('฿','') || ''} onChange={event => { if (!editingProject && !budgetDraft) setBudgetDraft(String(contractValue(event.target.value))); }} placeholder="เช่น 5,500,000"/></label></div>
      <div className="form-row"><label>ความคืบหน้า (%)<input name="progress" type="number" min="0" max="100" defaultValue={editingProject?.progress ?? 0}/></label><label>สถานะ<select name="status" defaultValue={editingProject?.status || 'วางแผน'}><option>วางแผน</option><option>กำลังก่อสร้าง</option><option>รอตรวจรับ</option><option>ส่งมอบแล้ว</option></select></label></div>
      <div className="form-row"><label>งบประมาณโครงการ<input name="budget" type="number" min="0" step="0.01" value={budgetDraft} onChange={event => setBudgetDraft(event.target.value)} placeholder="เช่น 5000000"/></label><label>ยอดเบิกจ่ายแล้ว<input name="disbursed" type="number" min="0" step="0.01" value={disbursedDraft} onChange={event => setDisbursedDraft(event.target.value)} placeholder="เช่น 1500000"/></label></div>
      <div className="budget-preview"><span>งบคงเหลือ</span><strong>฿{formatMoney(Math.max(parseAmount(budgetDraft), 0) - Math.min(Math.max(parseAmount(disbursedDraft), 0), Math.max(parseAmount(budgetDraft), 0)))}</strong></div>
      <div className="form-row"><label>กำหนดส่งมอบ<input name="date" type="date"/></label></div>
      <div className="modal-actions"><button type="button" className="btn btn-light" onClick={closeProjectModal}>ยกเลิก</button><button type="submit" className="btn btn-primary">{editingProject ? <Pencil size={16}/> : <Plus size={16}/>} {editingProject ? 'บันทึกการแก้ไข' : 'บันทึกโครงการ'}</button></div>
    </form></div></div>}
    {showDisbursementCreate && <div className="modal-backdrop" onClick={closeDisbursementModal}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-head"><div><h2>{editingDisbursement ? 'แก้ไขบิลเบิกจ่าย' : 'เพิ่มบิลเบิกจ่าย'}</h2><p>บันทึกยอดเบิกจ่ายและอัปเดตงบโครงการ</p></div><button className="icon-btn" onClick={closeDisbursementModal} aria-label="ปิด"><X size={19}/></button></div><form onSubmit={saveDisbursement}>
      <label>โครงการ<select name="projectId" required defaultValue={editingDisbursement?.projectId || ''}><option value="" disabled>เลือกโครงการ</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <div className="form-row"><label>ยอดเบิกจ่าย<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={editingDisbursement?.amount ?? ''} placeholder="เช่น 150000"/></label><label>วันที่บิล<input name="date" type="date" required defaultValue={editingDisbursement?.date || localDateInput()}/></label></div>
      <label>เลขที่บิล / รายละเอียด<input name="reference" defaultValue={editingDisbursement?.reference || ''} placeholder="เช่น INV-001 หรือ งวดงานที่ 1"/></label>
      <label className="slip-upload">รูปภาพสลิป<input type="file" accept="image/*" disabled={isSlipProcessing} onChange={handleSlipUpload}/><small>{isSlipProcessing ? 'กำลังประมวลผลรูปภาพ...' : 'รองรับรูปภาพ ขนาดต้นฉบับไม่เกิน 12 MB ระบบจะย่อรูปก่อนจัดเก็บ'}</small></label>
      {slipDraft && <div className="slip-preview"><img src={slipDraft} alt="ตัวอย่างรูปสลิป"/><button type="button" className="btn btn-light" onClick={() => setSlipDraft('')}>นำสลิปออก</button></div>}
      <div className="modal-actions"><button type="button" className="btn btn-light" onClick={closeDisbursementModal}>ยกเลิก</button><button type="submit" className="btn btn-primary" disabled={isSlipProcessing}>{editingDisbursement ? <Pencil size={16}/> : <Plus size={16}/>} {isSlipProcessing ? 'กำลังประมวลผลรูป' : editingDisbursement ? 'บันทึกการแก้ไข' : 'บันทึกบิล'}</button></div>
    </form></div></div>}
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}

function KpiCard({icon,tone,label,value,unit,note,badge,trend}) {
  return <div className="kpi-card"><div className="kpi-top"><div className={`kpi-icon ${tone}`}>{React.cloneElement(icon,{size:18})}</div><span className="kpi-label">{label}</span>{badge&&<em className="kpi-badge">{badge}</em>}</div><div className="kpi-value">{value}<small>{unit}</small></div><div className="kpi-note">{note}</div>{trend&&<div className="sparkline"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.map((v,i)=>({i,v}))}><Area type="monotone" dataKey="v" stroke={tone==='amber'?'#c69a5c':'#2787b0'} fill={tone==='mint'?'#bceadd':'#dcecf3'} strokeWidth={1.8}/></AreaChart></ResponsiveContainer></div>}</div>
}
function MiniLine({values}) { return <div className="mini-line"><ResponsiveContainer width="100%" height="100%"><AreaChart data={values.map((v,i)=>({i,v}))}><Area dataKey="v" type="monotone" stroke="#d8a33d" fill="none" strokeWidth={2}/></AreaChart></ResponsiveContainer></div> }
function DisbursementTable({rows, projects, onEdit}) {
  return <div className="table-scroll"><table className="project-table"><thead><tr><th>เลขที่บิล</th><th>โครงการ</th><th>เลขที่บิล / รายละเอียด</th><th>วันที่</th><th>ยอดเบิกจ่าย</th><th>สลิป</th><th>จัดการ</th></tr></thead><tbody>{rows.map(bill => {
    const project = projects.find(item => item.id === bill.projectId);
    const date = bill.date ? new Intl.DateTimeFormat('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${bill.date}T00:00:00`)) : '-';
    return <tr key={bill.id}><td>{bill.id}</td><td>{project?.name || bill.projectName}</td><td>{bill.reference || '-'}</td><td>{date}</td><td className="money">฿{formatMoney(bill.amount)}</td><td>{bill.slipDataUrl ? <a className="slip-link" href={bill.slipDataUrl} target="_blank" rel="noreferrer"><img src={bill.slipDataUrl} alt="" className="slip-thumbnail"/> ดูสลิป</a> : 'ไม่มีไฟล์'}</td><td><button type="button" className="table-action edit" onClick={() => onEdit(bill)} aria-label={`แก้ไขบิล ${bill.id}`} title="แก้ไข"><Pencil size={14}/></button></td></tr>;
  })}</tbody></table>{rows.length === 0 && <div className="no-results">ยังไม่มีบิลเบิกจ่าย</div>}</div>;
}
function ProjectTable({rows, onEdit, onDelete}) {
  return <div className="table-scroll"><table className="project-table"><thead><tr><th>ชื่อโครงการ</th><th>ลูกค้า</th><th>ความคืบหน้า</th><th>สถานะ</th><th>มูลค่าสัญญา</th><th>งบประมาณ</th><th>เบิกจ่ายแล้ว</th><th>คงเหลือ</th><th>กำหนดส่งมอบ</th><th>จัดการ</th></tr></thead><tbody>{rows.map(p=>{
    const budget = typeof p.budgetAmount === 'number' ? p.budgetAmount : (typeof p.contractAmount === 'number' ? p.contractAmount : contractValue(p.value));
    const disbursed = typeof p.disbursedAmount === 'number' ? p.disbursedAmount : 0;
    const remaining = budget - disbursed;
    const disbursementPercent = budget ? Math.min(disbursed / budget * 100, 100) : 0;
    return <tr key={p.id}><td><strong>{p.name}</strong><small>{p.id}</small></td><td>{p.client}</td><td><div className="table-progress"><span><i style={{width:`${p.progress}%`}}/></span><b>{p.progress}%</b></div></td><td><span className={`status-pill ${p.status==='ส่งมอบแล้ว'?'done':p.status==='วางแผน'?'planned':'working'}`}>{p.status}</span></td><td className="money">{p.value}</td><td className="money">฿{formatMoney(budget)}</td><td><div className="budget-cell"><strong>฿{formatMoney(disbursed)}</strong><span><i style={{width:`${disbursementPercent}%`}}/></span></div></td><td className={remaining < 0 ? 'money over-budget' : 'money'}>฿{formatMoney(remaining)}</td><td>{p.date}</td><td><div className="table-actions"><button type="button" className="table-action edit" onClick={()=>onEdit(p)} aria-label={`แก้ไข ${p.name}`} title="แก้ไข"><Pencil size={14}/></button><button type="button" className="table-action delete" onClick={()=>onDelete(p)} aria-label={`ลบ ${p.name}`} title="ลบ"><Trash2 size={14}/></button></div></td></tr>;
  })}</tbody></table>{rows.length===0&&<div className="no-results">ไม่พบข้อมูลที่ตรงกับคำค้นหา</div>}</div>
}

createRoot(document.getElementById('root')).render(<App/>);