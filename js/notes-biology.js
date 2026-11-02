/* Biology notes — configuration for the shared notes script (js/script.js).
   Load this before script.js on every biology notes page. The SITE list below
   builds the sidebar and the prev/next links, grouped by the units of the
   Pearson Edexcel IAL Biology specification (topics 1–8, practical units 3 and 6). */
window.NOTES_SUBJECT = 'biology';
window.NOTES_LOGO = 'Biology Notes';
window.NOTES_DIR = 'notes/biology/';
document.documentElement.setAttribute('data-subject', 'biology');

window.NOTES_SITE = [
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
];
