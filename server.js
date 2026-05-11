require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);

// --- 1. REGISTRACIJA I LOGIN (NOVO) ---
app.post('/api/register', (req, res) => {
    const { email, pass } = req.body;
    let users = [];
    if (fs.existsSync('users.json')) users = JSON.parse(fs.readFileSync('users.json'));

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ greska: 'Korisnik sa ovim emailom već postoji.' });
    }

    users.push({ email, pass });
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    res.status(200).json({ poruka: 'Uspešna registracija!' });
});

app.post('/api/login', (req, res) => {
    const { email, pass } = req.body;
    let users = [];
    if (fs.existsSync('users.json')) users = JSON.parse(fs.readFileSync('users.json'));

    const user = users.find(u => u.email === email && u.pass === pass);
    if (user) {
        res.status(200).json({ poruka: 'Uspešno ste prijavljeni!' });
    } else {
        res.status(401).json({ greska: 'Pogrešan email ili lozinka.' });
    }
});

// --- 2. PRIMANJE PORUDŽBINA ---
app.post('/api/poruci', async (req, res) => {
    const { kupac, korpa, ukupno } = req.body;
    const brojPorudzbine = 'HYA-' + Math.floor(Math.random() * 100000);
    
    // Sada beležimo sve nove podatke: telefon, grad i poštanski broj
    const novaPorudzbina = {
        id: brojPorudzbine,
        datum: new Date().toISOString(),
        kupac: kupac, // Sadrži: ime, email, adresa, telefon, grad, postanskiBroj
        korpa: korpa,
        ukupno: ukupno,
        status: "Na čekanju"
    };

    console.log(`Nova porudžbina: ${brojPorudzbine} za ${kupac.ime} (${kupac.grad})`);
    
    let svePorudzbine = [];
    if (fs.existsSync('baza.json')) svePorudzbine = JSON.parse(fs.readFileSync('baza.json'));
    
    svePorudzbine.push(novaPorudzbina);
    fs.writeFileSync('baza.json', JSON.stringify(svePorudzbine, null, 2));

    // Opciono: Slanje emaila (Radiće ako imaš ispravan RESEND_API_KEY)
    if(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')) {
        let stavkeHtml = korpa.map(item => `<li>${item.name} (x${item.qty}) - ${item.price * item.qty} RSD</li>`).join('');
        const emailSadrzaj = `
            <h2>Porudžbina: ${brojPorudzbine}</h2>
            <p><strong>Ime:</strong> ${kupac.ime}</p>
            <p><strong>Telefon:</strong> ${kupac.telefon}</p>
            <p><strong>Adresa:</strong> ${kupac.adresa}, ${kupac.grad} ${kupac.postanskiBroj}</p>
            <ul>${stavkeHtml}</ul>
            <h2>Ukupno pouzećem: ${ukupno} RSD</h2>
        `;
        try {
            await resend.emails.send({
                from: 'Hyalena Shop <onboarding@resend.dev>',
                to: ['tvoj_licni_email@gmail.com'], // Promeni ovo u tvoj email!
                subject: `Nova Porudžbina #${brojPorudzbine}`,
                html: emailSadrzaj
            });
        } catch(e) { console.error("Mejl nije poslat, ali porudžbina je sačuvana."); }
    }

    res.status(200).json({ poruka: 'Uspešno', brojPorudzbine: brojPorudzbine });
});

app.listen(PORT, () => console.log(`🚀 API aktivan na portu ${PORT}`));