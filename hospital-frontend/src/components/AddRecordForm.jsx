import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Pill, AlertCircle, Upload, X, Clock, CheckSquare } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill styles
import Card from './Card';
import { api } from '../services/api';

// Define the toolbar options outside the component to prevent re-rendering issues
const quillModules = {
    toolbar: [
        [{ 'list': 'bullet' }, { 'list': 'ordered' }]
    ]
};

const AddRecordForm = ({ patient, doctorId, appointmentId, onRecordAdded, refreshTrigger }) => {
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Medicine State
  const [availableMeds, setAvailableMeds] = useState([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [medQuantity, setMedQuantity] = useState(1);
  const [medDosage, setMedDosage] = useState('');
  const [medDuration, setMedDuration] = useState(''); 
  const [prescribedMeds, setPrescribedMeds] = useState([]);

  // Checkbox State
  const [buyFromHospital, setBuyFromHospital] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch Meds (Runs on mount AND when refreshTrigger changes)
  useEffect(() => {
    const fetchMeds = async () => {
      try {
        const meds = await api.inventory.getAll();
        setAvailableMeds(meds);
      } catch (err) { console.error("Failed to load medicines", err); }
    };
    fetchMeds();
  }, [refreshTrigger]);

  const handleAddMedicine = () => {
    if (!selectedMedId || !medQuantity || !medDosage || !medDuration) {
        setError("Please fill all medicine fields (Name, Qty, Dosage, Duration).");
        return;
    }

    const medInfo = availableMeds.find(m => m.medicine_id === parseInt(selectedMedId));
    if (!medInfo) return;

    if (medInfo.stock < medQuantity) {
        setError(`Insufficient stock for ${medInfo.name}. Only ${medInfo.stock} left.`);
        return;
    }

    setPrescribedMeds([...prescribedMeds, {
        medicine_id: medInfo.medicine_id,
        name: medInfo.name,
        quantity: parseInt(medQuantity),
        dosage: medDosage,
        duration: medDuration 
    }]);

    // Reset inputs
    setSelectedMedId('');
    setMedQuantity(1);
    setMedDosage('');
    setMedDuration('');
    setError('');
  };

  const handleRemoveMedicine = (index) => {
    const newList = [...prescribedMeds];
    newList.splice(index, 1);
    setPrescribedMeds(newList);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diagnosis) { setError('Diagnosis is required.'); return; }
    
    // --- UX FIX: WARN IF MEDICINE INPUTS ARE FILLED BUT NOT ADDED ---
    if (selectedMedId && (prescribedMeds.length === 0)) {
        setError("You selected a medicine but didn't click the '+' button to add it!");
        return;
    }

    setIsSubmitting(true);
    setError('');

    let uploadedFilePath = null;

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('medicalFile', selectedFile);
        const uploadResult = await api.upload(formData);
        uploadedFilePath = uploadResult.filePath;
      }

      const fullData = {
        patient_id: patient.patient_id,
        doctor_id: doctorId,
        appointment_id: appointmentId, 
        diagnosis,
        notes,
        treatment_plan: treatmentPlan,
        medicines: prescribedMeds,
        deduct_inventory: buyFromHospital,
        file_path: uploadedFilePath
      };

      await api.prescriptions.create(fullData);
      
      // Reset Form
      setDiagnosis(''); setNotes(''); setTreatmentPlan(''); 
      setPrescribedMeds([]); setSelectedFile(null); 
      setBuyFromHospital(false); // Reset Checkbox
      
      onRecordAdded(); 

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card title={`Rx: Prescribe for ${patient.name}`} icon={FileText} className="bg-white border-l-4 border-l-indigo-600 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {error && (
          <div className="bg-rose-50 text-rose-700 p-3.5 rounded-2xl flex items-center text-sm font-semibold border border-rose-100 animate-fade-in">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-rose-500"/> 
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Primary Diagnosis</label>
              <input 
                type="text" 
                placeholder="e.g., Acute Viral Rhinopharyngitis" 
                value={diagnosis} 
                onChange={(e) => setDiagnosis(e.target.value)} 
                className="w-full p-3.5 border border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition text-sm font-medium bg-slate-50/50 focus:bg-white" 
                required 
              />
            </div>
            
            {/* RICH TEXT EDITOR: Clinical Notes */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Clinical Notes & Observations</label>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition">
                  <ReactQuill 
                      theme="snow" 
                      value={notes} 
                      onChange={setNotes} 
                      modules={quillModules}
                      placeholder="Enter detailed clinical observations, vitals, examination notes..."
                      className="h-32 mb-10"
                  />
              </div>
            </div>
        </div>

        {/* --- FIXED UPLOAD BUTTON --- */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
            <label 
                htmlFor="medical-upload"
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-bold cursor-pointer transition-all ${
                  selectedFile 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
            >
                <Upload className="w-4 h-4 pointer-events-none text-indigo-500" />
                <span className="pointer-events-none">{selectedFile ? 'Change File' : 'Attach Lab Report / Scan'}</span>
            </label>
            
            <input 
                id="medical-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileChange} 
            />

            {selectedFile && (
                <div className="flex items-center gap-2 bg-indigo-50 px-3.5 py-1.5 rounded-full text-xs text-indigo-800 font-medium border border-indigo-200">
                    <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                    <button type="button" onClick={() => setSelectedFile(null)} className="text-indigo-400 hover:text-rose-500 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>

        {/* MEDICINE INPUT SECTION */}
        <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 flex items-center">
                <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg mr-2.5">
                  <Pill className="w-4 h-4"/>
                </div>
                Prescribe Medication
              </h4>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{availableMeds.length} Items In Stock</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Medicine Name</label>
                    <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium" value={selectedMedId} onChange={(e) => setSelectedMedId(e.target.value)}>
                        <option value="">-- Select from Pharmacy --</option>
                        {availableMeds.map(m => <option key={m.medicine_id} value={m.medicine_id} disabled={m.stock === 0}>{m.name} (Stock: {m.stock})</option>)}
                    </select>
                </div>
                <div className="sm:col-span-3">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Dosage</label>
                    <input type="text" placeholder="e.g. 1-0-1 after food" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium" value={medDosage} onChange={(e) => setMedDosage(e.target.value)}/>
                </div>
                <div className="sm:col-span-3">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Duration</label>
                    <input type="text" placeholder="e.g. 5 Days" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium" value={medDuration} onChange={(e) => setMedDuration(e.target.value)}/>
                </div>
                <div className="sm:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Qty</label>
                    <input type="number" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white text-center focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold" min="1" value={medQuantity} onChange={(e) => setMedQuantity(e.target.value)}/>
                </div>
                <div className="sm:col-span-1">
                    <button type="button" onClick={handleAddMedicine} disabled={!selectedMedId} className="w-full bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition active:scale-95 flex justify-center items-center h-[42px] disabled:opacity-40 cursor-pointer">
                        <Plus className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            {/* List of Added Meds */}
            {prescribedMeds.length > 0 && (
                <div className="space-y-2 pt-2">
                    {prescribedMeds.map((med, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-sm animate-fade-in">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="font-black text-slate-800">{med.name}</span>
                                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border border-indigo-100">{med.dosage}</span>
                                <span className="text-slate-500 text-xs font-medium">{med.duration}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-slate-500 text-xs font-bold bg-slate-100 px-2 py-1 rounded-md">Qty: {med.quantity}</span>
                                <button type="button" onClick={() => handleRemoveMedicine(idx)} className="text-slate-400 hover:text-rose-600 transition p-1">
                                  <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* RICH TEXT EDITOR: Treatment Plan */}
        <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Additional Treatment Plan</label>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition">
                <ReactQuill 
                    theme="snow" 
                    value={treatmentPlan} 
                    onChange={setTreatmentPlan} 
                    modules={quillModules}
                    placeholder="Provide diet recommendations, follow-up schedule, lifestyle guidelines..."
                    className="h-24 mb-10"
                />
            </div>
        </div>
        
        {/* Inventory Checkbox */}
        <div className="flex items-center gap-3 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100">
            <input 
                type="checkbox" 
                id="pharmacyCheck"
                checked={buyFromHospital}
                onChange={(e) => setBuyFromHospital(e.target.checked)}
                className="w-5 h-5 text-emerald-600 rounded-lg focus:ring-emerald-500 border-gray-300 cursor-pointer"
            />
            <label htmlFor="pharmacyCheck" className="text-sm font-bold text-emerald-900 cursor-pointer select-none">
                Dispense from In-House Pharmacy
                <span className="block text-xs font-normal text-emerald-700 mt-0.5">
                    Automatically reserve dosage and deduct quantity from live hospital stock inventory
                </span>
            </label>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition-all duration-150 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
        >
          {isSubmitting ? 'Recording Prescription...' : 'Authorize & Issue Prescription'}
        </button>
      </form>
    </Card>
  );
};

export default AddRecordForm;