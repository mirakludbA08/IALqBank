/* IAL Prep — the site map: each subject's question-bank Units, notes pages, past papers and
   study report. The top navigation bar (js/nav.js) builds its menus from this list, and each
   subject's notes config (js/notes-<subject>.js) takes its pages from it, so a page added here
   appears in the menus, the notes sidebar and the prev/next links. Load it before both.

   bank: the menu columns for the question bank. Each Unit is [key, name, level]; the key is the
   Unit as the question bank's topic tree names it ("Unit 1 ...", "Unit P1 ...").
   notes: [{ level, unit, code, name, pages: [[file, title, blurb], ...] }], as js/script.js reads it. */
window.IALQB_SITE = {
  physics: {
    label: 'Physics',
    code: 'WPH11',
    notesHome: 'pages/index.html',
    notesDir: 'pages/',
    report: 'reports/Physics%20-%20Exam%20Study%20Report.md',
    bank: [
      { name: 'Question bank', units: [
        ['1', 'Mechanics and Materials', 'AS'],
        ['2', 'Waves and Electricity', 'AS'],
        ['3', 'Practical Skills in Physics I', 'AS'],
        ['4', 'Further Mechanics, Fields and Particles', 'A2'],
        ['5', 'Thermodynamics, Radiation, Oscillations and Cosmology', 'A2'],
        ['6', 'Practical Skills in Physics II', 'A2']
      ] }
    ],
    notes: [
      {
        level: 'AS', unit: 'Unit 1', code: 'WPH11', name: 'Mechanics & Materials',
        pages: [
          ['Motion.html', 'Motion', 'SUVAT, motion graphs, vectors and projectiles'],
          ['Forces_Momentum.html', 'Forces & Momentum', "Newton's laws, free-body diagrams, momentum in 1D"],
          ['Moments.html', 'Moments', 'Moments, centre of gravity, equilibrium'],
          ['Energy.html', 'Energy', 'Work, kinetic & potential energy, power, efficiency'],
          ['Density_Upthrust_VisDrag.html', 'Density, Upthrust & Viscous Drag', "Archimedes, Stokes' law, terminal velocity"],
          ['Stretching_Materials.html', 'Stretching Materials', "Hooke's law, stress, strain, Young modulus"]
        ]
      },
      {
        level: 'AS', unit: 'Unit 2', code: 'WPH12', name: 'Waves & Electricity',
        pages: [
          ['Waves.html', 'Progressive Waves', 'Transverse & longitudinal waves, v = fλ, intensity, pulse-echo'],
          ['Superposition_Stationary_Waves.html', 'Superposition & Stationary Waves', 'Phase, path difference, interference, standing waves'],
          ['Refraction_Diffraction_Polarisation.html', 'Refraction, Diffraction & Polarisation', "Snell's law, TIR, gratings, polarisation"],
          ['Particle_Nature_Light.html', 'Particle Nature of Light', 'Photons, photoelectric effect, energy levels, de Broglie'],
          ['Current_Resistance.html', 'Current, P.D. & Resistance', 'I = nqvA, resistivity, I–V graphs, power'],
          ['DC_Circuits.html', 'Circuits, Potential Dividers & E.M.F.', 'Series & parallel, potential dividers, internal resistance']
        ]
      },
      {
        level: 'A2', unit: 'Unit 4', code: 'WPH14', name: 'Further Mechanics, Fields & Particles',
        pages: [
          ['Further_Momentum.html', 'Impulse & 2D Collisions', 'Impulse, 2D momentum, elastic & inelastic collisions'],
          ['Circular_Motion.html', 'Circular Motion', 'Radians, angular velocity, centripetal force'],
          ['Electric_Fields.html', 'Electric Fields', "Coulomb's law, field strength, potential"],
          ['Capacitors.html', 'Capacitors', 'Capacitance, energy stored, RC charge & discharge'],
          ['Magnetic_Fields_Induction.html', 'Magnetic Fields & Induction', "F = BIl, F = Bqv, Faraday's & Lenz's laws"],
          ['Nuclear_Particle_Physics.html', 'Nuclear & Particle Physics', 'Alpha scattering, accelerators, quarks & leptons']
        ]
      },
      {
        level: 'A2', unit: 'Unit 5', code: 'WPH15', name: 'Thermodynamics, Radiation, Oscillations & Cosmology',
        pages: [
          ['Thermodynamics.html', 'Thermodynamics', 'Heat capacity, latent heat, ideal gases, kinetic theory'],
          ['Nuclear_Decay.html', 'Nuclear Decay', 'Binding energy, α β γ, half-life, exponential decay'],
          ['Oscillations.html', 'Oscillations', 'Simple harmonic motion, damping, resonance'],
          ['Gravitational_Fields.html', 'Gravitational Fields', 'Newton\'s law of gravitation, potential, orbits'],
          ['Astrophysics_Cosmology.html', 'Astrophysics & Cosmology', 'Stars, HR diagram, distances, redshift, Hubble']
        ]
      },
      {
        level: 'AS + A2', unit: 'Units 3 & 6', code: 'WPH13 / WPH16', name: 'Practical Skills',
        pages: [
          ['Practical_Skills.html', 'Practical Skills & Uncertainties', 'Uncertainties, graphs, log plots, all 16 core practicals']
        ]
      }
    ]
  },

  chemistry: {
    label: 'Chemistry',
    code: 'WCH11',
    notesHome: 'notes/chemistry/index.html',
    notesDir: 'notes/chemistry/',
    report: 'reports/Chemistry%20-%20Exam%20Study%20Report.md',
    bank: [
      { name: 'Question bank', units: [
        ['1', 'Structure, Bonding and Introduction to Organic Chemistry', 'AS'],
        ['2', 'Energetics, Group Chemistry, Halogenoalkanes and Analytical Techniques', 'AS'],
        ['3', 'Practical Skills in Chemistry I', 'AS'],
        ['4', 'Rates, Equilibria and Further Organic Chemistry', 'A2'],
        ['5', 'Transition Metals and Organic Nitrogen Chemistry', 'A2'],
        ['6', 'Practical Skills in Chemistry II', 'A2']
      ] }
    ],
    notes: [
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
          ['15-carbonyls-acids-chirality.html', 'Carbonyls, carboxylic acids and chirality', 'Optical isomers, aldehydes, ketones, acids, esters, NMR, chromatography']
        ]
      },
      {
        level: 'A2', unit: 'Unit 5', code: 'WCH15', name: 'Transition Metals and Organic Nitrogen Chemistry',
        pages: [
          ['16-redox-equilibria.html', 'Redox equilibria', 'Electrode potentials, cells, redox titrations, fuel cells'],
          ['17-transition-metals.html', 'Transition metals and their chemistry', 'Complex ions, colour, ligand exchange, catalysis'],
          ['18-arenes.html', 'Arenes', 'Benzene structure, electrophilic substitution, phenol'],
          ['19-organic-nitrogen.html', 'Organic nitrogen compounds', 'Amines, amides, amino acids, proteins, polymers'],
          ['20-organic-synthesis.html', 'Organic synthesis', 'Synthetic routes, Grignard reagents, practical techniques']
        ]
      },
      {
        level: 'AS + A2', unit: 'Units 3 & 6', code: 'WCH13 / WCH16', name: 'Practical Skills',
        pages: [
          ['practical-skills.html', 'Core practicals and skills', 'Every core practical, techniques, errors and uncertainties']
        ]
      }
    ]
  },

  biology: {
    label: 'Biology',
    code: 'WBI11',
    notesHome: 'notes/biology/index.html',
    notesDir: 'notes/biology/',
    report: 'reports/Biology%20-%20Exam%20Study%20Report.md',
    bank: [
      { name: 'Question bank', units: [
        ['1', 'Molecules, Diet, Transport and Health', 'AS'],
        ['2', 'Cells, Development, Biodiversity and Conservation', 'AS'],
        ['3', 'Practical Skills in Biology I', 'AS'],
        ['4', 'Energy, Environment, Microbiology and Immunity', 'A2'],
        ['5', 'Respiration, Internal Environment, Coordination and Gene Technology', 'A2'],
        ['6', 'Practical Skills in Biology II', 'A2']
      ] }
    ],
    notes: [
      {
        level: 'AS', unit: 'Unit 1', code: 'WBI11', name: 'Molecules, Diet, Transport and Health',
        pages: [
          ['1a-chemistry-for-biologists.html', 'Chemistry for biologists', 'Water, carbohydrates, lipids'],
          ['1b-mammalian-transport.html', 'Mammalian transport', 'Circulation, the heart, blood vessels, haemoglobin'],
          ['1c-cardiovascular-health.html', 'Cardiovascular health', 'Atherosclerosis, risk factors, diet, treatment'],
          ['2a-membranes-transport.html', 'Membranes and transport', 'Gas exchange, membrane structure, diffusion, osmosis, active transport'],
          ['2b-proteins-dna.html', 'Proteins and DNA', 'Amino acids, protein structure, enzymes, DNA and replication'],
          ['2c-gene-expression.html', 'Gene expression and genetics', 'Transcription, translation, mutation, inheritance, screening']
        ]
      },
      {
        level: 'AS', unit: 'Unit 2', code: 'WBI12', name: 'Cells, Development, Biodiversity and Conservation',
        pages: [
          ['3a-cell-structure.html', 'Cell structure', 'Eukaryotic and prokaryotic cells, organelles, microscopy'],
          ['3b-mitosis-meiosis.html', 'Mitosis, meiosis and reproduction', 'Cell cycle, meiosis, gametes, fertilisation'],
          ['3c-development-organisms.html', 'Development of organisms', 'Stem cells, differentiation, gene expression, phenotype'],
          ['4a-plant-structure.html', 'Plant structure and function', 'Plant cells, starch and cellulose, xylem, phloem, plant drugs'],
          ['4bc-classification-biodiversity.html', 'Classification, biodiversity and conservation', 'Biodiversity, adaptation, classification, conservation']
        ]
      },
      {
        level: 'A2', unit: 'Unit 4', code: 'WBI14', name: 'Energy, Environment, Microbiology and Immunity',
        pages: [
          ['5a-photosynthesis.html', 'Photosynthesis', 'Light-dependent and light-independent reactions'],
          ['5bc-ecology-climate.html', 'Ecology, environment and climate change', 'Energy flow, ecosystems, climate change, evolution'],
          ['6ab-microbiology-immunity.html', 'Microbiology and immunity', 'Microbial techniques, pathogens, immunity, antibiotics'],
          ['6c-decomposition-forensics.html', 'Decomposition and forensics', 'Time of death, decomposition, DNA profiling']
        ]
      },
      {
        level: 'A2', unit: 'Unit 5', code: 'WBI15', name: 'Respiration, Internal Environment, Coordination and Gene Technology',
        pages: [
          ['7a-cellular-respiration.html', 'Cellular respiration', 'Glycolysis, link reaction, Krebs cycle, oxidative phosphorylation'],
          ['7b-muscles-heart.html', 'Muscles, movement and the heart', 'Sliding filament theory, cardiac cycle, ECGs'],
          ['7c-internal-environment.html', 'Control of the internal environment', 'Homeostasis, ventilation, thermoregulation, the kidney'],
          ['8ab-nervous-coordination.html', 'Nervous system and coordination', 'Neurones, synapses, receptors, the brain, plant responses'],
          ['8c-gene-technology.html', 'Gene technology', 'Recombinant DNA, PCR, genetic modification']
        ]
      },
      {
        level: 'AS + A2', unit: 'Units 3 & 6', code: 'WBI13 / WBI16', name: 'Practical Skills',
        pages: [
          ['practical-skills.html', 'Core practicals and skills', 'Every core practical, variables, data handling, statistics']
        ]
      }
    ]
  },

  maths: {
    label: 'Maths',
    code: 'WMA11',
    notesHome: null,
    notesDir: null,
    report: 'reports/Maths%20-%20Exam%20Study%20Report.md',
    bank: [
      { name: 'Pure', units: [['P1', 'Pure Mathematics 1'], ['P2', 'Pure Mathematics 2'], ['P3', 'Pure Mathematics 3'], ['P4', 'Pure Mathematics 4']] },
      { name: 'Further Pure', units: [['FP1', 'Further Pure Mathematics 1'], ['FP2', 'Further Pure Mathematics 2'], ['FP3', 'Further Pure Mathematics 3']] },
      { name: 'Mechanics', units: [['M1', 'Mechanics 1'], ['M2', 'Mechanics 2'], ['M3', 'Mechanics 3']] },
      { name: 'Statistics', units: [['S1', 'Statistics 1'], ['S2', 'Statistics 2'], ['S3', 'Statistics 3']] },
      { name: 'Decision', units: [['D1', 'Decision Mathematics 1']] }
    ],
    notes: []
  }
};
