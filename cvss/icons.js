/* CVSS v4.0 Base Score Calculator - Icons */
var cvssIcons = {
  AV: {
    N: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    A: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/></svg>',
    L: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/></svg>',
    P: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/></svg>'
  },
  AC: {
    L: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12l4 4 12-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    H: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12l4 4 12-12M4 8l4 4 12-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  AT: {
    N: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12l5 5L20 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    P: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2L2 22h20L12 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>'
  },
  PR: {
    N: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    L: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 8l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    H: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2l3 7h7l-5 4 2 7-7-5-7 5 2-7-5-4h7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
  },
  UI: {
    N: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12h16M16 8l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    P: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="18" cy="6" r="2" fill="currentColor" opacity="0.5"/></svg>',
    A: '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  VC: {
    H: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    L: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    N: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="8" x2="20" y2="16" stroke="currentColor" stroke-width="2"/><line x1="20" y1="8" x2="4" y2="16" stroke="currentColor" stroke-width="2"/></svg>'
  },
  VI: {
    H: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12l3 3 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    L: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    N: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="8" x2="16" y2="16" stroke="currentColor" stroke-width="2"/><line x1="16" y1="8" x2="8" y2="16" stroke="currentColor" stroke-width="2"/></svg>'
  },
  VA: {
    H: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 12h2M6 8v8M10 5v14M14 3v18M18 8v8M22 12h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    L: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 12h2M6 8v8M10 5v14M14 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    N: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 12h2M6 8v8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2"/></svg>'
  }
};
cvssIcons.SC = cvssIcons.VC;
cvssIcons.SI = cvssIcons.VI;
cvssIcons.SA = cvssIcons.VA;
