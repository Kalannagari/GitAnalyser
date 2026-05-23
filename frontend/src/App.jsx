import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  CircularProgress,
  Avatar,
  Link,
  CardHeader,
  Divider,
  Paper,
} from '@mui/material';
import {
  GitBranch,
  Search,
  Sparkles,
  ExternalLink,
  Star,
  Eye,
  AlertCircle,
  Code,
  Users,
  Activity,
  History,
  Tag,
  Compass,
  ArrowRightCircle,
  CheckCircle2,
  Package,
  Database,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { Line, Radar, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js modules
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  CategoryScale,
  LinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Language custom color mappings
const languageColorMap = {
  python: '#3572A5',
  javascript: '#f1e05a',
  typescript: '#3178c6',
  go: '#00ADD8',
  rust: '#dea584',
  java: '#b07219',
  'c++': '#f34b7d',
  c: '#555555',
  html: '#e34c26',
  css: '#563d7c',
  shell: '#89e051',
  ruby: '#701516',
  php: '#4F5D95',
  'c#': '#178600',
  swift: '#f05138',
  kotlin: '#A97BFF',
  dockerfile: '#384d54',
};

function formatCount(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.toLocaleString('default', { month: 'short' });
  return `${month} ${d.getDate()}`;
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 0) return 'just now';
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval === 1 ? '1 year ago' : `${interval} years ago`;
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval === 1 ? '1 month ago' : `${interval} months ago`;
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval === 1 ? '1 day ago' : `${interval} days ago`;
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval === 1 ? '1 min ago' : `${interval} mins ago`;
  
  return 'just now';
}

function getRandomColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export default function App() {
  const [repoInput, setRepoInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');

  // AI Summary typewriter state
  const [typedSummary, setTypedSummary] = useState('');
  const [showRecs, setShowRecs] = useState(false);
  const typingTimerRef = useRef(null);

  // Trigger typewriter effect on new summary
  useEffect(() => {
    if (!data?.ai_summary?.summary) return;
    
    setTypedSummary('');
    setShowRecs(false);
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    
    const text = data.ai_summary.summary;
    let i = 0;
    
    typingTimerRef.current = setInterval(() => {
      if (i < text.length) {
        i++;
        setTypedSummary(text.slice(0, i));
      } else {
        clearInterval(typingTimerRef.current);
        setShowRecs(true);
      }
    }, 5);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [data]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!repoInput.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/v1/analyze?repo_url=${encodeURIComponent(repoInput.trim())}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'An error occurred during repo analysis.');
      }

      setData(result.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format inline bold/code markdown for typing effect
  const formatText = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  };

  // Helper styles for glassmorphic containers
  const glassCardStyle = {
    p: 3,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  };

  // 1. Language Chart Data Setup
  const getLanguagesChartData = () => {
    if (!data?.languages) return { labels: [], datasets: [] };
    const sortedLangs = Object.entries(data.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const labels = sortedLangs.map(([lang]) => lang);
    const bgColors = sortedLangs.map(([lang]) => languageColorMap[lang.toLowerCase()] || getRandomColor(lang));
    const datasetData = sortedLangs.map(([, bytes]) => bytes);

    return {
      labels,
      datasetData,
      bgColors,
      totalBytes: Object.values(data.languages).reduce((a, b) => a + b, 0),
    };
  };

  const langDataInfo = getLanguagesChartData();
  const languagesChartData = {
    labels: langDataInfo.labels,
    datasets: [
      {
        data: langDataInfo.datasetData,
        backgroundColor: langDataInfo.bgColors,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    ],
  };

  // 2. Commit Timeline Data Setup
  const commitTimeline = data?.commit_activity?.timeline || [];
  const commitsTimelineData = {
    labels: commitTimeline.map((item) => formatDate(item.date)),
    datasets: [
      {
        label: 'Commits',
        data: commitTimeline.map((item) => item.commits),
        borderColor: '#a78bfa',
        borderWidth: 2,
        pointBackgroundColor: '#a78bfa',
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 350);
          gradient.addColorStop(0, 'rgba(167, 139, 250, 0.35)');
          gradient.addColorStop(1, 'rgba(167, 139, 250, 0.00)');
          return gradient;
        },
      },
    ],
  };

  // 3. Commit Weekly Pulse Radar Data
  const weeklyPulse = data?.commit_activity?.weekly_pulse || {};
  const weeklyDaysOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const commitsWeeklyData = {
    labels: weeklyDaysOrder,
    datasets: [
      {
        label: 'Commits',
        data: weeklyDaysOrder.map((day) => weeklyPulse[day] || 0),
        borderColor: '#2dd4bf',
        backgroundColor: 'rgba(45, 212, 191, 0.15)',
        borderWidth: 2,
        pointBackgroundColor: '#2dd4bf',
        pointHoverRadius: 6,
      },
    ],
  };

  // 4. Commit Hourly Activity Bar Data
  const hourlyActivity = data?.commit_activity?.hourly_activity || Array(24).fill(0);
  const hourlyLabels = [
    "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
    "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"
  ];
  const commitsHourlyData = {
    labels: hourlyLabels,
    datasets: [
      {
        label: 'Commits',
        data: hourlyActivity,
        borderRadius: 5,
        borderWidth: 0,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, '#fb7185');
          gradient.addColorStop(1, '#8b5cf6');
          return gradient;
        },
      },
    ],
  };

  // Render variables
  const repo = data?.repository;
  const healthOffset = 314 - ((data?.health?.score || 0) / 100) * 314;

  return (
    <Container maxWidth="xl" sx={{ py: 6, zIndex: 1, position: 'relative' }}>
      {/* Decorative Orbs */}
      <div className="background-decor">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 7 }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <GitBranch size={42} style={{ color: '#a78bfa', filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.4))' }} />
          <Typography variant="h1" component="span" sx={{ fontSize: { xs: '2.5rem', md: '3.2rem' } }}>
            Git<span style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analyzer</span>
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.125rem', maxWidth: 600, mx: 'auto' }}>
          Extract rich statistics, commits timeline, and contributors insights from public GitHub repositories.
        </Typography>
      </Box>

      {/* Search & Input Form */}
      <Box sx={{ maxWidth: 650, mx: 'auto', mb: 6 }}>
        <form onSubmit={handleSearch}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ position: 'relative', flexGrow: 1 }}>
              <TextField
                fullWidth
                variant="outlined"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="e.g. fastapi/fastapi or https://github.com/facebook/react"
                required
                InputProps={{
                  startAdornment: <Search size={20} style={{ color: '#94a3b8', marginRight: '12px' }} />,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '14px',
                    color: 'text.primary',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                    '&.Mui-focused fieldset': { borderColor: '#a78bfa' },
                    '&.Mui-focused': { boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.07)' },
                  },
                }}
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
                color: 'white',
                borderRadius: '14px',
                px: 3.5,
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(139, 92, 246, 0.5)',
                },
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Analyze</span>
                  <Sparkles size={16} />
                </Box>
              )}
            </Button>
          </Box>
        </form>

        {/* Error Container */}
        {error && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mt: 2.5,
              p: 2,
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}
      </Box>

      {/* Loading State Spinner */}
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, gap: 3 }}>
          <div className="spinner" style={{
            width: '3.5rem',
            height: '3.5rem',
            border: '4px solid rgba(255, 255, 255, 0.05)',
            borderTopColor: '#a78bfa',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.3))'
          }}></div>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Analyzing repository structure and history...
          </Typography>
        </Box>
      )}

      {/* Dashboard Dashboard Data display */}
      {data && repo && (
        <Box sx={{ animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          
          {/* Repo Header Card */}
          <Paper sx={{ p: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Header Info */}
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
                <Avatar
                  src={repo.owner.avatar_url}
                  alt={repo.full_name}
                  variant="rounded"
                  sx={{ width: 80, height: 80, border: '2px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)' }}
                />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h2" sx={{ fontSize: '1.75rem', fontWeight: 700 }}>
                      {repo.full_name}
                    </Typography>
                    <Link href={repo.html_url} target="_blank" rel="noopener" sx={{ color: 'text.secondary', display: 'inline-flex', '&:hover': { color: '#a78bfa' } }}>
                      <ExternalLink size={20} />
                    </Link>
                  </Box>
                  <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2, maxWidth: 1200 }}>
                    {repo.description || 'No repository description available.'}
                  </Typography>
                  
                  {/* Tags */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {repo.license && (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', color: 'text.secondary', fontWeight: 550 }}>
                        <Scale size={15} />
                        <span>{repo.license}</span>
                      </Box>
                    )}
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', color: 'text.secondary', fontWeight: 550 }}>
                      <Database size={15} />
                      <span>{(repo.size_kb / 1024).toFixed(1)} MB</span>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />

              {/* Quick Stats Row (Side-by-side) */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.02)', transition: 'all 0.2s ease', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' } }}>
                    <Star size={20} style={{ color: '#f59e0b', marginBottom: '4px' }} />
                    <Typography variant="h5" sx={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatCount(repo.stars)}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 650 }}>Stars</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.02)', transition: 'all 0.2s ease', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' } }}>
                    <GitBranch size={20} style={{ color: '#2dd4bf', marginBottom: '4px' }} />
                    <Typography variant="h5" sx={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatCount(repo.forks)}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 650 }}>Forks</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.02)', transition: 'all 0.2s ease', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' } }}>
                    <Eye size={20} style={{ color: '#a78bfa', marginBottom: '4px' }} />
                    <Typography variant="h5" sx={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatCount(repo.watchers)}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 650 }}>Watchers</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.02)', transition: 'all 0.2s ease', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)' } }}>
                    <AlertCircle size={20} style={{ color: '#fb7185', marginBottom: '4px' }} />
                    <Typography variant="h5" sx={{ fontSize: '1.4rem', fontWeight: 700 }}>{formatCount(repo.open_issues)}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 650 }}>Issues</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {/* Detailed Analysis 3-Column Grid */}
          <Grid container spacing={4} alignItems="flex-start">
            
            {/* Column 1: Languages, Health Score & Top Contributors */}
            <Grid item xs={12} lg={4} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Languages Card */}
              <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Code size={20} style={{ color: '#a78bfa' }} />
                  <Typography variant="h5" sx={{ fontSize: '1.25rem' }}>Languages Distribution</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
                  {langDataInfo.labels.length > 0 ? (
                    <>
                      <Box sx={{ position: 'relative', width: '100%', maxWidth: 200, mx: 'auto', aspectRatio: '1/1' }}>
                        <Doughnut
                          data={languagesChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: (context) => {
                                    const bytes = context.raw;
                                    const percentage = ((bytes / langDataInfo.totalBytes) * 100).toFixed(1);
                                    return ` ${context.label}: ${percentage}%`;
                                  },
                                },
                              },
                            },
                            cutout: '65%',
                          }}
                        />
                      </Box>
                      <Grid container spacing={1.5}>
                        {langDataInfo.labels.map((lang, index) => {
                          const bytes = langDataInfo.datasetData[index];
                          const percentage = ((bytes / langDataInfo.totalBytes) * 100).toFixed(1);
                          const color = langDataInfo.bgColors[index];
                          return (
                            <Grid item xs={6} key={lang} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
                              <Box sx={{ width: 12, height: 12, borderRadius: '3px', backgroundColor: color, flexShrink: 0 }} />
                              <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 550, color: 'text.primary', maxWidth: '70px' }}>
                                {lang}
                              </Typography>
                              <Typography variant="body2" component="span" sx={{ color: 'text.secondary', ml: 'auto' }}>
                                {percentage}%
                              </Typography>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </>
                  ) : (
                    <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No languages detected.</Typography>
                  )}
                </Box>
              </Paper>

              {/* Health Score Card */}
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <ShieldCheck size={20} style={{ color: '#2dd4bf' }} />
                  <Typography variant="h5" sx={{ fontSize: '1.25rem' }}>Repository Health</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  {/* Custom animated SVG ring */}
                  <Box sx={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="health-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#14b8a6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <circle cx="60" cy="60" r="50" style={{ fill: 'none', stroke: 'rgba(255, 255, 255, 0.03)', strokeWidth: 8 }} />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        style={{
                          fill: 'none',
                          stroke: 'url(#health-grad)',
                          strokeWidth: 8,
                          strokeLinecap: 'round',
                          strokeDasharray: '314',
                          strokeDashoffset: healthOffset,
                          transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      />
                    </svg>
                    <Typography variant="h3" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
                      {data.health.score}%
                    </Typography>
                  </Box>

                  {/* Checklist */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, width: '100%' }}>
                    {data.health.checklist.map((item, idx) => {
                      const isSuccess = item.status === 'success';
                      const isWarning = item.status === 'warning';
                      const iconColor = isSuccess ? '#2dd4bf' : (isWarning ? '#fb7185' : '#a78bfa');
                      
                      return (
                        <Box key={idx} sx={{ display: 'flex', gap: 1.5, p: 1.25, border: '1px solid rgba(255, 255, 255, 0.03)', backgroundColor: 'rgba(255, 255, 255, 0.01)', borderRadius: '10px', alignItems: 'flex-start' }}>
                          <CheckCircle2 size={18} style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }} />
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary', lineHeight: 1.3 }}>{item.item}</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>{item.details}</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Paper>

              {/* Top Contributors Card */}
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
                  <Users size={20} style={{ color: '#2dd4bf' }} />
                  <Typography variant="h5" sx={{ fontSize: '1.25rem' }}>Top Contributors</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {data.contributors.length > 0 ? (
                    data.contributors.map((c, index) => (
                      <Box key={index} sx={{ display: 'flex', gap: 1.5, p: 1.5, border: '1px solid rgba(255, 255, 255, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', transition: 'all 0.2s ease', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(45, 212, 191, 0.25)', transform: 'translateX(4px)' }, alignItems: 'center' }}>
                        <Typography sx={{ fontFamily: '"Outfit", sans-serif', fontSize: '0.85rem', fontWeight: 700, color: 'text.secondary', width: '15px', textAlign: 'center' }}>
                          #{index + 1}
                        </Typography>
                        <Avatar src={c.avatar_url} alt={c.login} sx={{ width: 36, height: 36, border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                        <Link href={c.html_url} target="_blank" rel="noopener" sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', textDecoration: 'none', '&:hover': { color: '#2dd4bf' } }}>
                          {c.login}
                        </Link>
                        <Typography sx={{ ml: 'auto', fontSize: '0.8rem', backgroundColor: 'rgba(20, 184, 166, 0.1)', color: '#2dd4bf', px: 1, py: 0.5, borderRadius: '6px', fontWeight: 600 }}>
                          {c.contributions} commits
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', textAlign: 'center', py: 2 }}>No contributors found.</Typography>
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Column 2: AI Summary, Commit Insights & Feeds */}
            <Grid item xs={12} lg={8} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* AI Summary Card */}
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Sparkles size={20} style={{ color: '#fb7185', animation: 'pulseSlow 3s infinite ease-in-out' }} />
                  <Typography variant="h5" sx={{ fontSize: '1.25rem' }}>AI Repository Summary</Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    dangerouslySetInnerHTML={{ __html: formatText(typedSummary) }}
                    sx={{
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                      color: 'text.primary',
                      mb: 2.5,
                      '& strong': { color: '#2dd4bf', fontWeight: 700 },
                      '& code': { fontFamily: 'monospace', fontSize: '0.85rem', backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#a78bfa', px: 0.4, py: 0.1, borderRadius: '4px' },
                    }}
                  />
                  {showRecs && (
                    <Box sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', pt: 2, animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Compass size={18} style={{ color: '#fb7185' }} />
                        <Typography variant="subtitle2" sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Actionable Recommendations</Typography>
                      </Box>
                      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {data.ai_summary.recommendations.map((rec, index) => (
                          <Box component="li" key={index} sx={{ display: 'flex', gap: 1.25, fontSize: '0.85rem', color: 'text.secondary', alignItems: 'flex-start', lineHeight: 1.4 }}>
                            <ArrowRightCircle size={18} style={{ color: '#fb7185', flexShrink: 0, marginTop: '1px' }} />
                            <span>{rec}</span>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Commit Insights Charts Card */}
              <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', pb: 2, mb: 3, flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Activity size={20} style={{ color: '#fb7185' }} />
                    <Typography variant="h5" sx={{ fontSize: '1.25rem' }}>Commit Insights</Typography>
                  </Box>
                  {/* Micro Tabs buttons */}
                  <Box sx={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', p: 0.5, gap: 0.5 }}>
                    {['timeline', 'weekly', 'hourly'].map((tab) => (
                      <Button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        sx={{
                          py: 0.75,
                          px: 2,
                          borderRadius: '8px',
                          color: activeTab === tab ? 'text.primary' : 'text.secondary',
                          backgroundColor: activeTab === tab ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                          boxShadow: activeTab === tab ? '0 2px 10px rgba(0, 0, 0, 0.2)' : 'none',
                          fontSize: '0.8rem',
                          minWidth: 'auto',
                          '&:hover': {
                            backgroundColor: activeTab === tab ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            color: 'text.primary',
                          },
                        }}
                      >
                        {tab === 'timeline' ? 'Timeline' : (tab === 'weekly' ? 'Weekly Pulse' : 'Hourly Activity')}
                      </Button>
                    ))}
                  </Box>
                </Box>

                {/* Tab Contents */}
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {activeTab === 'timeline' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: -1.5, mb: 3, fontSize: '0.85rem' }}>
                        Frequency timeline of the last 100 commits
                      </Typography>
                      <Box sx={{ position: 'relative', width: '100%', height: 320 }}>
                        <Line
                          data={commitsTimelineData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#64748b', font: { size: 9 }, autoSkip: true, maxTicksLimit: 12 } },
                              y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#64748b', font: { size: 9 }, stepSize: 1 }, beginAtZero: true },
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {activeTab === 'weekly' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: -1.5, mb: 3, fontSize: '0.85rem' }}>
                        Commit distribution by day of the week
                      </Typography>
                      <Box sx={{ position: 'relative', width: '100%', height: 320 }}>
                        <Radar
                          data={commitsWeeklyData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              r: {
                                angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
                                grid: { color: 'rgba(255, 255, 255, 0.08)' },
                                pointLabels: { color: '#94a3b8', font: { size: 10, weight: '500' } },
                                ticks: { backdropColor: 'transparent', color: '#64748b', font: { size: 8 }, stepSize: 1, beginAtZero: true },
                              },
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {activeTab === 'hourly' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: -1.5, mb: 3, fontSize: '0.85rem' }}>
                        Commit distribution by hour of day (UTC)
                      </Typography>
                      <Box sx={{ position: 'relative', width: '100%', height: 320 }}>
                        <Bar
                          data={commitsHourlyData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8 }, autoSkip: true, maxTicksLimit: 12 } },
                              y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#64748b', font: { size: 8 }, stepSize: 1 }, beginAtZero: true },
                            },
                          }}
                        />
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Feeds Row */}
              <Grid container spacing={3}>
                {/* Recent Commits Feed */}
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Paper sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
                      <History size={20} style={{ color: '#a78bfa' }} />
                      <Typography variant="h5" sx={{ fontSize: '1.25rem' }}>Recent Commits</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
                      {data.commit_activity.recent_commits.length > 0 ? (
                        data.commit_activity.recent_commits.map((c, idx) => (
                          <Box key={idx} sx={{ display: 'flex', gap: 1.5, p: 1.5, border: '1px solid rgba(255, 255, 255, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', transition: 'all 0.2s ease', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)', transform: 'translateX(4px)' } }}>
                            {c.author_avatar_url ? (
                              <Avatar src={c.author_avatar_url} sx={{ width: 36, height: 36, border: '1px solid rgba(255, 255, 255, 0.1)' }} />
                            ) : (
                              <Box sx={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', flexShrink: 0 }}>
                                <GitBranch size={16} />
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 550, color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.message}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap', fontSize: '0.75rem', color: 'text.secondary' }}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 650, color: 'text.primary' }}>{c.author_name}</Typography>
                                <span>•</span>
                                <span>{timeAgo(c.date)}</span>
                                <span>•</span>
                                <Link href={c.html_url} target="_blank" rel="noopener" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', backgroundColor: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', px: 0.75, py: 0.25, borderRadius: '4px', textDecoration: 'none', '&:hover': { backgroundColor: 'rgba(167, 139, 250, 0.2)' } }}>
                                  {c.sha}
                                </Link>
                              </Box>
                            </Box>
                          </Box>
                        ))
                      ) : (
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', textAlign: 'center', py: 2 }}>No recent commits found.</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>

                {/* Latest Releases Card */}
                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Paper sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
                      <Tag size={20} style={{ color: '#fb7185' }} />
                      <Typography variant="h5" sx={{ fontSize: '1.25rem' }}>Latest Releases</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1 }}>
                      {data.releases && data.releases.length > 0 ? (
                        data.releases.map((r, idx) => (
                          <Box key={idx} sx={{ display: 'flex', gap: 1.5, p: 1.5, border: '1px solid rgba(255, 255, 255, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', transition: 'all 0.2s ease', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderColor: 'rgba(255, 255, 255, 0.1)', transform: 'translateX(4px)' } }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(251, 113, 133, 0.1)', border: '1px solid rgba(251, 113, 133, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185', flexShrink: 0 }}>
                              <Package size={16} />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <Link href={r.html_url} target="_blank" rel="noopener" sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { color: '#fb7185' } }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {r.name || r.tag_name}
                                </Typography>
                              </Link>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.7rem', backgroundColor: 'rgba(251, 113, 133, 0.1)', color: '#fb7185', px: 0.75, py: 0.25, borderRadius: '4px' }}>
                                  {r.tag_name}
                                </Typography>
                                <span>•</span>
                                <span>{timeAgo(r.published_at)}</span>
                              </Box>
                            </Box>
                          </Box>
                        ))
                      ) : (
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', textAlign: 'center', py: 2 }}>No releases published yet.</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>

          </Grid>
        </Box>
      )}
    </Container>
  );
}
