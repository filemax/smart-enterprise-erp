window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-content'));
    document.querySelectorAll('.tabs-nav .tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active-content');
    if(window.event && window.event.currentTarget) window.event.currentTarget.classList.add('active');
};