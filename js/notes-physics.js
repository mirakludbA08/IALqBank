/* Physics notes — configuration for the shared notes script (js/script.js).
   Load this before script.js on every physics notes page. The SITE list builds
   the sidebar, the prev/next links, the home page unit cards and the question
   bank's notes drawer. */
window.NOTES_SUBJECT = 'physics';
window.NOTES_LOGO = 'Physics Notes';
window.NOTES_DIR = 'pages/';
document.documentElement.setAttribute('data-subject', 'physics');

window.NOTES_SITE = [
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
];
