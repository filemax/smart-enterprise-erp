// Smart Enterprise ERP - Supabase Connection
const SUPABASE_URL = 'https://zqvwsjhoxsmplhigsmrv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdndzamhveHNtcGxoaWdzbXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTgzMjMsImV4cCI6MjEwNjA5NDMyM30.MXlJ5lY6vPDPpdbwKe3dpvpk3oQr9TTrVb5-ZCIxS_Q';

let supabaseClient = null;

function initSupabase(){
    if(!supabaseClient && window.supabase){
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

async function cloudSave(table, data){
    const client = initSupabase();
    if(!client) return {error:'Supabase not loaded'};
    return await client.from(table).upsert(data);
}

async function cloudLoad(table){
    const client = initSupabase();
    if(!client) return [];
    const {data,error}=await client.from(table).select('*');
    if(error) console.error('Supabase:', error);
    return data || [];
}

async function supabaseSignIn(email,password){
    const client=initSupabase();
    return await client.auth.signInWithPassword({email,password});
}

async function supabaseSignOut(){
    const client=initSupabase();
    if(client) return await client.auth.signOut();
}
