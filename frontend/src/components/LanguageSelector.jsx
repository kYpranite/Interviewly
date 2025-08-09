import React, { useState } from 'react';
import './LanguageSelector.css';

function LanguageSelector({ selectedLanguage, onLanguageChange }) {
    const [isOpen, setIsOpen] = useState(false);
    
    const languages = [
        { id: 'python', name: 'Python 3' },
        { id: 'javascript', name: 'JavaScript' },
        { id: 'typescript', name: 'TypeScript' },
        { id: 'java', name: 'Java' },
        { id: 'cpp', name: 'C++' },
    ];

    const handleLanguageSelect = (language) => {
        onLanguageChange(language);
        setIsOpen(false);
    };

    const selectedLang = languages.find(lang => lang.id === selectedLanguage) || languages[0];

    return (
        <div className="language-selector">
            <label className="language-label">Language</label>
            <div className="dropdown-container">
                <button 
                    className="dropdown-button"
                    onClick={() => setIsOpen(!isOpen)}
                    type="button"
                >
                    <span>{selectedLang.name}</span>
                    <svg 
                        className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
                        width="12" 
                        height="8" 
                        viewBox="0 0 12 8" 
                        fill="none"
                    >
                        <path 
                            d="M1 1.5L6 6.5L11 1.5" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
                
                {isOpen && (
                    <div className="dropdown-menu">
                        {languages.map((language) => (
                            <button
                                key={language.id}
                                className={`dropdown-item ${selectedLanguage === language.id ? 'selected' : ''}`}
                                onClick={() => handleLanguageSelect(language.id)}
                                type="button"
                            >
                                {language.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LanguageSelector;
