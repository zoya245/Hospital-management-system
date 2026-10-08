const express = require('express');
const router = express.Router();

router.post('/triage', async (req, res) => {
    const { symptoms, available_doctors } = req.body;

    if (!symptoms || !available_doctors || available_doctors.length === 0) {
        return res.status(400).json({ error: "Missing symptoms or doctor list." });
    }

    // Helper to format doctor name cleanly without duplicate 'Dr.'
    const formatDocName = (name) => {
        if (!name) return "Doctor";
        return name.startsWith('Dr.') ? name : `Dr. ${name}`;
    };

    // Intelligent symptom-to-specialist matcher when external AI is unavailable or unconfigured
    const matchDoctorByKeywords = (symptomsText, doctors) => {
        const text = (symptomsText || '').toLowerCase();
        
        const specialtyKeywords = [
            {
                key: 'cardio',
                specialty: 'Cardiologist',
                terms: 'Cardiovascular assessment indicated for reported symptoms.',
                keywords: ['chest', 'heart', 'palpitation', 'palpitations', 'shortness of breath', 'bp', 'blood pressure', 'hypertension', 'angina', 'cardiac', 'pulse', 'cholesterol', 'artery']
            },
            {
                key: 'neuro',
                specialty: 'Neurologist',
                terms: 'Neurological evaluation indicated for reported symptoms.',
                keywords: ['headache', 'migraine', 'dizzy', 'dizziness', 'seizure', 'faint', 'brain', 'numb', 'numbness', 'stroke', 'paralysis', 'vertigo', 'tremor', 'nervous']
            },
            {
                key: 'ortho',
                specialty: 'Orthopedic Surgeon',
                terms: 'Orthopedic and musculoskeletal consultation indicated.',
                keywords: ['bone', 'joint', 'fracture', 'knee', 'back pain', 'spine', 'shoulder', 'arthritis', 'sprain', 'ligament', 'muscle ache', 'stiffness', 'posture', 'hip', 'wrist']
            },
            {
                key: 'pediat',
                specialty: 'Pediatrician',
                terms: 'Pediatric clinical consultation recommended.',
                keywords: ['child', 'kid', 'infant', 'baby', 'toddler', 'newborn', 'pediatric', 'vaccination', 'measles']
            },
            {
                key: 'derma',
                specialty: 'Dermatologist',
                terms: 'Dermatological assessment recommended for cutaneous symptoms.',
                keywords: ['skin', 'rash', 'acne', 'itching', 'allergy', 'eczema', 'spot', 'mole', 'dermatitis']
            }
        ];

        for (const item of specialtyKeywords) {
            const hasMatch = item.keywords.some(kw => text.includes(kw));
            if (hasMatch) {
                const found = doctors.find(d => (d.specialization || '').toLowerCase().includes(item.key));
                if (found) {
                    return { doctor: found, terms: item.terms };
                }
            }
        }

        // Default: find general physician or first available doctor
        const generalDoc = doctors.find(d => {
            const spec = (d.specialization || '').toLowerCase();
            return spec.includes('general') || spec.includes('medicine') || spec.includes('internal');
        }) || doctors[0];

        return { 
            doctor: generalDoc, 
            terms: 'General outpatient consultation recommended for initial evaluation.' 
        };
    };

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey.includes('your_')) throw new Error("GEMINI_API_KEY is not configured");

        const prompt = `
        You are an expert hospital triage AI. 
        Symptoms: "${symptoms}"
        Doctors: ${JSON.stringify(available_doctors)}
        
        Task: Select the best doctor ID from the list.
        Respond ONLY with a valid JSON object. Do NOT wrap it in markdown.
        Format exactly:
        {
          "recommended_doctor_id": 1,
          "recommended_doctor_name": "Name",
          "specialty": "Specialty",
          "medical_terms": "Clinical description of symptoms",
          "patient_friendly_explanation": "A friendly 1-sentence explanation of why this specialist was selected based on the symptoms."
        }
        `;

        const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Google API Rejected: ${JSON.stringify(data.error)}`);
        }

        // Extract and clean the text
        let aiResponse = data.candidates[0].content.parts[0].text;
        aiResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(aiResponse);
        return res.json(parsedData);

    } catch (error) {
        // Fallback to intelligent local clinical matching
        const { doctor: matchedDoctor, terms: medicalTerms } = matchDoctorByKeywords(symptoms, available_doctors);
        const docDisplayName = formatDocName(matchedDoctor.name);
        const specName = matchedDoctor.specialization || "General Medicine";

        return res.json({
            recommended_doctor_id: matchedDoctor.doctor_id,
            recommended_doctor_name: matchedDoctor.name,
            specialty: specName,
            medical_terms: medicalTerms,
            patient_friendly_explanation: `Based on your reported symptoms, we have matched you with ${docDisplayName} (${specName}) who can assist you right away.`
        });
    }
});

module.exports = router;