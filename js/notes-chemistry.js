/* Chemistry notes — configuration for the shared notes script (js/script.js).
   Load this before script.js on every chemistry notes page. The SITE list below
   builds the sidebar, the prev/next links and the question bank's notes drawer,
   grouped by the units of the Pearson Edexcel IAL Chemistry specification
   (topics 1–20, practical units 3 and 6). */
window.NOTES_SUBJECT = 'chemistry';
window.NOTES_LOGO = 'Chemistry Notes';
window.NOTES_DIR = 'notes/chemistry/';
document.documentElement.setAttribute('data-subject', 'chemistry');

window.NOTES_SITE = [
  {
    level: 'AS', unit: 'Unit 1', code: 'WCH11', name: 'Structure, Bonding and Introduction to Organic Chemistry',
    pages: [
      ['01-formulae-equations.html', 'Formulae, equations and amounts of substance', 'Moles, concentrations, gas volumes, yield, atom economy'],
      ['02-atomic-structure.html', 'Atomic structure and the periodic table', 'Mass spectrometry, electron configurations, ionisation energies'],
      ['03-bonding-structure.html', 'Bonding and structure', 'Ionic, covalent and metallic bonding, shapes of molecules'],
      ['04-organic-alkanes.html', 'Introductory organic chemistry and alkanes', 'Naming, isomerism, fuels, free-radical substitution'],
      ['05-alkenes.html', 'Alkenes', 'Electrophilic addition, polymers, tests for alkenes']
    ]
  },
  {
    level: 'AS', unit: 'Unit 2', code: 'WCH12', name: 'Energetics, Group Chemistry, Halogenoalkanes and Alcohols',
    pages: [
      ['06-energetics.html', 'Energetics', 'Enthalpy changes, calorimetry, Hess cycles, bond enthalpies'],
      ['07-intermolecular-forces.html', 'Intermolecular forces', 'London forces, dipoles, hydrogen bonding, solubility'],
      ['08-redox-groups.html', 'Redox chemistry and groups 1, 2 and 7', 'Oxidation numbers, group 2 trends, halogens and halides'],
      ['09-kinetics-equilibria-intro.html', 'Introduction to kinetics and equilibria', 'Collision theory, Maxwell–Boltzmann, Le Chatelier'],
      ['10-halogenoalkanes-alcohols.html', 'Halogenoalkanes, alcohols and spectra', 'Substitution, elimination, oxidation, IR and mass spectra']
    ]
  },
  {
    level: 'A2', unit: 'Unit 4', code: 'WCH14', name: 'Rates, Equilibria and Further Organic Chemistry',
    pages: [
      ['11-kinetics.html', 'Kinetics', 'Rate equations, orders, mechanisms, activation energy'],
      ['12-entropy-energetics.html', 'Entropy and energetics', 'Lattice energy, Born–Haber cycles, entropy, Gibbs energy'],
      ['13-chemical-equilibria.html', 'Chemical equilibria', 'Kc, Kp, effect of conditions on K'],
      ['14-acid-base.html', 'Acid-base equilibria', 'pH, Ka, Kw, buffers, titration curves, indicators'],
      ['15-carbonyls-acids-chirality.html', 'Carbonyls, carboxylic acids and chirality', 'Optical isomers, aldehydes, ketones, acids, esters, NMR, chromatography'],
    ]
  },
  {
    level: 'A2', unit: 'Unit 5', code: 'WCH15', name: 'Transition Metals and Organic Nitrogen Chemistry',
    pages: [
      ['16-redox-equilibria.html', 'Redox equilibria', 'Electrode potentials, cells, redox titrations, fuel cells'],
      ['17-transition-metals.html', 'Transition metals and their chemistry', 'Complex ions, colour, ligand exchange, catalysis'],
      ['18-arenes.html', 'Arenes', 'Benzene structure, electrophilic substitution, phenol'],
      ['19-organic-nitrogen.html', 'Organic nitrogen compounds', 'Amines, amides, amino acids, proteins, polymers'],
      ['20-organic-synthesis.html', 'Organic synthesis', 'Synthetic routes, Grignard reagents, practical techniques'],
    ]
  },
  {
    level: 'AS + A2', unit: 'Units 3 & 6', code: 'WCH13 / WCH16', name: 'Practical Skills',
    pages: [
      ['practical-skills.html', 'Core practicals and skills', 'Every core practical, techniques, errors and uncertainties'],
    ]
  }
];
