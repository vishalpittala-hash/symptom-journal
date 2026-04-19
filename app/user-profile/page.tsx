"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function UserProfilePage() {
  const router = useRouter()

  const [name, setName] = useState<string>("")
  const [age, setAge] = useState<string>("")
  const [gender, setGender] = useState<string>("")
  const [conditions, setConditions] = useState<string>("")
  const [activityLevel, setActivityLevel] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [showSuccess, setShowSuccess] = useState<boolean>(false)

  useEffect(() => {
    // Load existing profile if available
    const savedProfile = localStorage.getItem('symptomProfile')
    if (savedProfile) {
      const profile = JSON.parse(savedProfile)
      if (profile.name) setName(profile.name)
      if (profile.age) setAge(profile.age.toString())
      if (profile.gender) setGender(profile.gender)
      if (profile.conditions) setConditions(profile.conditions)
      if (profile.activityLevel) setActivityLevel(profile.activityLevel)
    }
  }, [])

  const handleSave = async () => {
    if (!name || !age || !gender || !activityLevel) {
      alert("Please fill required fields")
      return
    }

    setLoading(true)

    // Save profile to localStorage
    const profile = {
      name,
      age: Number(age),
      gender,
      conditions: conditions && conditions.toLowerCase() !== 'no' ? conditions : '',
      activityLevel
    }
    localStorage.setItem('symptomProfile', JSON.stringify(profile))

    setLoading(false)
    setShowSuccess(true)
    
    // Redirect after showing success message
    setTimeout(() => {
      router.push("/")
    }, 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      
      <div style={{ width: '100%', maxWidth: '450px', backgroundColor: 'white', padding: '2.5rem', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>👤</div>

          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
            Set up your profile
          </h1>

          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            This helps us personalize your health insights
          </p>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Name *</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.75rem', outline: 'none', fontSize: '1rem', color: '#111827' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Age *</label>
            <input
              type="number"
              placeholder="Enter your age"
              value={age}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAge(e.target.value)
              }
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.75rem', outline: 'none', fontSize: '1rem', color: '#111827' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Gender *</label>
            <select
              value={gender}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setGender(e.target.value)
              }
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.75rem', outline: 'none', fontSize: '1rem', color: '#111827' }}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Pre-existing Conditions</label>
            <input
              type="text"
              placeholder="Try: migraine, asthma, diabetes"
              value={conditions}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConditions(e.target.value)
              }
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.75rem', outline: 'none', fontSize: '1rem', color: '#111827' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>Activity Level *</label>
            <select
              value={activityLevel}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setActivityLevel(e.target.value)
            }
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.75rem', outline: 'none', fontSize: '1rem', color: '#111827' }}
            >
              <option value="">Activity Level</option>
              <option value="low">🛋️ Low (rare exercise)</option>
              <option value="medium">🚶 Medium (weekly activity)</option>
              <option value="high">🏃 High (daily active)</option>
            </select>
          </div>

        </div>

        {/* Success Message */}
        {showSuccess && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: '#dcfce7',
            border: '1px solid #22c55e',
            color: '#166534',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            ✅ Profile saved successfully!<br />
            Your future insights will now be personalized.
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleSave}
          disabled={loading || showSuccess}
          style={{ width: '100%', marginTop: '1.5rem', backgroundColor: '#4f46e5', color: 'white', padding: '1rem', borderRadius: '0.75rem', fontWeight: '600', fontSize: '1.125rem', cursor: (loading || showSuccess) ? 'not-allowed' : 'pointer', opacity: (loading || showSuccess) ? 0.5 : 1 }}
        >
          {loading ? "Saving..." : showSuccess ? "Saved!" : "Save & Personalize My Insights"}
        </button>

        {/* Helper Section */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '0.5rem',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem' }}>
            🤖 How this helps you
          </div>
          <div style={{ fontSize: '0.875rem', color: '#0c4a6e', lineHeight: '1.5' }}>
            <div>• Insights will be tailored to your age group</div>
            <div>• We consider your conditions (e.g., migraine, asthma)</div>
            <div>• Recommendations adapt to your activity level</div>
          </div>
        </div>

      </div>
    </div>
  )
}