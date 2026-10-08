/** Rule-based interpreter outputs captured before the v1.4 contract refactor (engine 1.3.0, generated from the committed v1.3 sources). Generated; do not edit. */
export const interpreterReference = [
 {
  "brief": "Design a lightweight bridge spanning 2 meters that supports 500 N.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Design a lightweight bridge spanning 2 meters that supports 500 N.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a lightweight bridge spanning 2 meters that supports 500 N.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 meters"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 4 m steel footbridge truss must carry a 3 kN point load at midspan with a safety factor of 2.5; minimise mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 4 m steel footbridge truss must carry a 3 kN point load at midspan with a safety factor of 2.5; minimise mass.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 4,
    "panels": 4,
    "depthMin_m": 0.1,
    "depthMax_m": 1.2,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 3000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2.5,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2.5 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2.5 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.016,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 3000 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 4 m steel footbridge truss must carry a 3 kN point load at midspan with a safety factor of 2.5; minimise mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 4,
    "confidence": "high",
    "sourceSpan": "4 m"
   },
   {
    "field": "load_N",
    "value": 3000,
    "confidence": "high",
    "sourceSpan": "3 kN"
   },
   {
    "field": "safetyFactor",
    "value": 2.5,
    "confidence": "high",
    "sourceSpan": "safety factor of 2.5"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "steel"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design the stiffest 2 m aluminium truss bridge for a 500 N midspan load, keeping the mass under 2 kg.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Design the stiffest 2 m aluminium truss bridge for a 500 N midspan load, keeping the mass under 2 kg.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design the stiffest 2 m aluminium truss bridge for a 500 N midspan load, keeping the mass under 2 kg.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "material",
    "value": "aluminum-6061-t6",
    "confidence": "high",
    "sourceSpan": "aluminium"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Truss bridge: span 3 m, midspan load 1 kN, titanium, safety factor 2, deflection limit L/400, minimum mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Truss bridge: span 3 m, midspan load 1 kN, titanium, safety factor 2, deflection limit L/400, minimum mass.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 3,
    "panels": 4,
    "depthMin_m": 0.07500000000000001,
    "depthMax_m": 0.8999999999999999,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "titanium-6al-4v",
    "name": "Titanium Ti-6Al-4V",
    "youngsModulus_Pa": 113800000000,
    "density_kg_m3": 4430,
    "thermalConductivity_W_mK": 6.7,
    "yieldStrength_Pa": 880000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 1000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.0075,
     "label": "Max deflection <= span / 400",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 1000 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "deflectionLimit",
     "value": "Span / 400",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Truss bridge: span 3 m, midspan load 1 kN, titanium, safety factor 2, deflection limit L/400, minimum mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 m"
   },
   {
    "field": "load_N",
    "value": 1000,
    "confidence": "high",
    "sourceSpan": "1 kN"
   },
   {
    "field": "safetyFactor",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "safety factor 2"
   },
   {
    "field": "material",
    "value": "titanium-6al-4v",
    "confidence": "high",
    "sourceSpan": "titanium"
   },
   {
    "field": "deflectionRatio",
    "value": 400,
    "confidence": "high",
    "sourceSpan": "L/400"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 1500 mm steel truss bridge must carry a 2 kN load with a safety factor of 1.5, minimising mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 1500 mm steel truss bridge must carry a 2 kN load with a safety factor of 1.5, minimising mass.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 1.5,
    "panels": 4,
    "depthMin_m": 0.037500000000000006,
    "depthMax_m": 0.44999999999999996,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 2000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 1.5,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 1.5 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 1.5 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.006,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 2000 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 1500 mm steel truss bridge must carry a 2 kN load with a safety factor of 1.5, minimising mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 1.5,
    "confidence": "high",
    "sourceSpan": "1500 mm"
   },
   {
    "field": "load_N",
    "value": 2000,
    "confidence": "high",
    "sourceSpan": "2 kN"
   },
   {
    "field": "safetyFactor",
    "value": 1.5,
    "confidence": "high",
    "sourceSpan": "safety factor of 1.5"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "steel"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Bridge with a 3 m span holding 50 kg",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Bridge with a 3 m span holding 50 kg",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 3,
    "panels": 4,
    "depthMin_m": 0.07500000000000001,
    "depthMax_m": 0.8999999999999999,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 490.3325,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.012,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 490.3325 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Bridge with a 3 m span holding 50 kg",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 m"
   },
   {
    "field": "load_N",
    "value": 490.3325,
    "confidence": "high",
    "sourceSpan": "50 kg",
    "note": "Converted 50 kg to 490.3 N using g = 9.80665 m/s^2."
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Truss bridge, span 250 cm, load 0.75 kN, deflection limit L/300.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Stiffest bridge within a mass budget",
   "brief": "Truss bridge, span 250 cm, load 0.75 kN, deflection limit L/300.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2.5,
    "panels": 4,
    "depthMin_m": 0.0625,
    "depthMax_m": 0.75,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 750,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "compliance",
     "metric": "compliance_J",
     "direction": "minimize",
     "label": "Compliance"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008333333333333333,
     "label": "Max deflection <= span / 300",
     "source": "assumed"
    },
    {
     "id": "mass-budget",
     "metric": "mass_kg",
     "op": "<=",
     "limit": 3.176829730159649,
     "label": "Mass <= 3.177 kg",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-mass-budget",
     "field": "massBudget",
     "value": "3.177 kg (mass of the conventional baseline)",
     "reason": "A stiffness objective needs a mass budget or the stiffest design is simply the heaviest; the brief gave none.",
     "confidence": "medium"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 750 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 300",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Truss bridge, span 250 cm, load 0.75 kN, deflection limit L/300.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2.5,
    "confidence": "high",
    "sourceSpan": "250 cm"
   },
   {
    "field": "load_N",
    "value": 750,
    "confidence": "high",
    "sourceSpan": "0.75 kN"
   },
   {
    "field": "deflectionRatio",
    "value": 300,
    "confidence": "high",
    "sourceSpan": "L/300"
   },
   {
    "field": "objective",
    "value": "minimize compliance",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 10 ft truss bridge carrying 200 lbf at the centre; minimize weight.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 10 ft truss bridge carrying 200 lbf at the centre; minimize weight.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "2.0 m",
     "reason": "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 10 ft truss bridge carrying 200 lbf at the centre; minimize weight.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Span: 2.0 metres. Load: 1.2 kilonewtons. Safety factor 1.8. Steel.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Span: 2.0 metres. Load: 1.2 kilonewtons. Safety factor 1.8. Steel.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 1.8,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 1.8 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 1.8 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Span: 2.0 metres. Load: 1.2 kilonewtons. Safety factor 1.8. Steel.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2.0 metres"
   },
   {
    "field": "safetyFactor",
    "value": 1.8,
    "confidence": "high",
    "sourceSpan": "Safety factor 1.8"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "Steel"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "We need a truss footbridge across a two-metre gap; it should hold about five hundred newtons at the middle and weigh as little as possible.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "We need a truss footbridge across a two-metre gap; it should hold about five hundred newtons at the middle and weigh as little as possible.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "2.0 m",
     "reason": "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "We need a truss footbridge across a two-metre gap; it should hold about five hundred newtons at the middle and weigh as little as possible.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Minimum-mass planar truss: L = 3 m, P = 1 kN at midspan, SF = 2.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Minimum-mass planar truss: L = 3 m, P = 1 kN at midspan, SF = 2.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 3,
    "panels": 4,
    "depthMin_m": 0.07500000000000001,
    "depthMax_m": 0.8999999999999999,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 1000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.012,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 1000 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Minimum-mass planar truss: L = 3 m, P = 1 kN at midspan, SF = 2.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 m"
   },
   {
    "field": "load_N",
    "value": 1000,
    "confidence": "high",
    "sourceSpan": "1 kN"
   },
   {
    "field": "safetyFactor",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "SF = 2"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "The bridge is 2.4 m long and carries a 600 N load. Use steel and design for minimum mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "The bridge is 2.4 m long and carries a 600 N load. Use steel and design for minimum mass.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2.4,
    "panels": 4,
    "depthMin_m": 0.06,
    "depthMax_m": 0.72,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 600,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.0096,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 600 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "The bridge is 2.4 m long and carries a 600 N load. Use steel and design for minimum mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2.4,
    "confidence": "high",
    "sourceSpan": "2.4 m"
   },
   {
    "field": "load_N",
    "value": 600,
    "confidence": "high",
    "sourceSpan": "600 N"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "steel"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 2 m (2000 mm) truss bridge with a 500 N load at midspan; keep it as light as possible.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 2 m (2000 mm) truss bridge with a 500 N load at midspan; keep it as light as possible.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 2 m (2000 mm) truss bridge with a 500 N load at midspan; keep it as light as possible.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a lightweight bridge.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Design a lightweight bridge.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "2.0 m",
     "reason": "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a lightweight bridge.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a steel truss bridge spanning 3 m, minimising mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Design a steel truss bridge spanning 3 m, minimising mass.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 3,
    "panels": 4,
    "depthMin_m": 0.07500000000000001,
    "depthMax_m": 0.8999999999999999,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.012,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a steel truss bridge spanning 3 m, minimising mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 m"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "steel"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 2 m bridge carrying 500 N, or maybe 800 N if the heavier cart is used; keep it light.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 2 m bridge carrying 500 N, or maybe 800 N if the heavier cart is used; keep it light.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 2 m bridge carrying 500 N, or maybe 800 N if the heavier cart is used; keep it light.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Bridge spanning 2 m with a 500 N load; the span might be 2 m or 3 m depending on the site.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Bridge spanning 2 m with a 500 N load; the span might be 2 m or 3 m depending on the site.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Bridge spanning 2 m with a 500 N load; the span might be 2 m or 3 m depending on the site.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 2 m span bridge carrying 500 N; note that the drawing says 2500 mm.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 2 m span bridge carrying 500 N; note that the drawing says 2500 mm.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 2 m span bridge carrying 500 N; note that the drawing says 2500 mm.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a 2 m aluminium truss bridge that carries 500 kN with a safety factor of 2 and a deflection limit of L/1000.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Stiffest bridge within a mass budget",
   "brief": "Design a 2 m aluminium truss bridge that carries 500 kN with a safety factor of 2 and a deflection limit of L/1000.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "compliance",
     "metric": "compliance_J",
     "direction": "minimize",
     "label": "Compliance"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.002,
     "label": "Max deflection <= span / 1000",
     "source": "assumed"
    },
    {
     "id": "mass-budget",
     "metric": "mass_kg",
     "op": "<=",
     "limit": 8.543376618407356,
     "label": "Mass <= 8.543 kg",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-mass-budget",
     "field": "massBudget",
     "value": "8.543 kg (mass of the conventional baseline)",
     "reason": "A stiffness objective needs a mass budget or the stiffest design is simply the heaviest; the brief gave none.",
     "confidence": "medium"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500000 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "deflectionLimit",
     "value": "Span / 1000",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a 2 m aluminium truss bridge that carries 500 kN with a safety factor of 2 and a deflection limit of L/1000.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500000,
    "confidence": "high",
    "sourceSpan": "500 kN"
   },
   {
    "field": "safetyFactor",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "safety factor of 2"
   },
   {
    "field": "material",
    "value": "aluminum-6061-t6",
    "confidence": "high",
    "sourceSpan": "aluminium"
   },
   {
    "field": "deflectionRatio",
    "value": 1000,
    "confidence": "high",
    "sourceSpan": "L/1000"
   },
   {
    "field": "objective",
    "value": "minimize compliance",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a lightweight 3D space truss spanning 3 meters that carries 2 kN at midspan.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Space truss girder study",
   "brief": "Design a lightweight 3D space truss spanning 3 meters that carries 2 kN at midspan.",
   "domain": "structural3d",
   "geometry": {
    "kind": "space-truss",
    "span_m": 3,
    "bays": 2,
    "width_m": 0.5,
    "depthMin_m": 0.075,
    "depthMax_m": 1,
    "areaMin_m2": 0.000002,
    "areaMax_m2": 0.001
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 2000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Stress x 2 <= yield",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.012,
     "label": "Deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)",
     "reason": "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.",
     "confidence": "high"
    },
    {
     "id": "assume-2",
     "field": "width",
     "value": "0.500 m (span / 6)",
     "reason": "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 aluminium is the engine's default alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "load",
     "value": "2000 N vertical at the midspan top node",
     "reason": "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "section",
     "value": "Solid round bars; Euler buckling with K = 1",
     "reason": "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "span / 250",
     "reason": "Serviceability deflection limit used as a generic preliminary-design value, not a code value.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "bracing",
     "value": "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan",
     "reason": "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.",
     "confidence": "medium"
    },
    {
     "id": "assume-9",
     "field": "analysisModel",
     "value": "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes",
     "reason": "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a lightweight 3D space truss spanning 3 meters that carries 2 kN at midspan.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 meters"
   },
   {
    "field": "load_N",
    "value": 2000,
    "confidence": "high",
    "sourceSpan": "2 kN"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   },
   {
    "field": "domain",
    "value": "structural3d",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Spatial truss girder, 6 m span, 5 kN midspan load, steel, safety factor 2; minimise mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Space truss girder study",
   "brief": "Spatial truss girder, 6 m span, 5 kN midspan load, steel, safety factor 2; minimise mass.",
   "domain": "structural3d",
   "geometry": {
    "kind": "space-truss",
    "span_m": 6,
    "bays": 2,
    "width_m": 1,
    "depthMin_m": 0.15,
    "depthMax_m": 2,
    "areaMin_m2": 0.000002,
    "areaMax_m2": 0.001
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 5000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Stress x 2 <= yield",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.024,
     "label": "Deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)",
     "reason": "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.",
     "confidence": "high"
    },
    {
     "id": "assume-2",
     "field": "width",
     "value": "1.000 m (span / 6)",
     "reason": "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "load",
     "value": "5000 N vertical at the midspan top node",
     "reason": "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "section",
     "value": "Solid round bars; Euler buckling with K = 1",
     "reason": "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "span / 250",
     "reason": "Serviceability deflection limit used as a generic preliminary-design value, not a code value.",
     "confidence": "low"
    },
    {
     "id": "assume-6",
     "field": "bracing",
     "value": "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan",
     "reason": "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes",
     "reason": "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Spatial truss girder, 6 m span, 5 kN midspan load, steel, safety factor 2; minimise mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 6,
    "confidence": "high",
    "sourceSpan": "6 m"
   },
   {
    "field": "load_N",
    "value": 5000,
    "confidence": "high",
    "sourceSpan": "5 kN"
   },
   {
    "field": "safetyFactor",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "safety factor 2"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "steel"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   },
   {
    "field": "domain",
    "value": "structural3d",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Three-dimensional truss girder spanning 4500 mm carrying 300 kg at the centre.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Space truss girder study",
   "brief": "Three-dimensional truss girder spanning 4500 mm carrying 300 kg at the centre.",
   "domain": "structural3d",
   "geometry": {
    "kind": "space-truss",
    "span_m": 4.5,
    "bays": 2,
    "width_m": 0.75,
    "depthMin_m": 0.1125,
    "depthMax_m": 1.5,
    "areaMin_m2": 0.000002,
    "areaMax_m2": 0.001
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 2941.995,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Stress x 2 <= yield",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.018,
     "label": "Deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)",
     "reason": "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.",
     "confidence": "high"
    },
    {
     "id": "assume-2",
     "field": "width",
     "value": "0.750 m (span / 6)",
     "reason": "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 aluminium is the engine's default alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "load",
     "value": "2941.995 N vertical at the midspan top node",
     "reason": "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "section",
     "value": "Solid round bars; Euler buckling with K = 1",
     "reason": "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "span / 250",
     "reason": "Serviceability deflection limit used as a generic preliminary-design value, not a code value.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "bracing",
     "value": "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan",
     "reason": "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.",
     "confidence": "medium"
    },
    {
     "id": "assume-9",
     "field": "analysisModel",
     "value": "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes",
     "reason": "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Three-dimensional truss girder spanning 4500 mm carrying 300 kg at the centre.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 4.5,
    "confidence": "high",
    "sourceSpan": "4500 mm"
   },
   {
    "field": "load_N",
    "value": 2941.995,
    "confidence": "high",
    "sourceSpan": "300 kg",
    "note": "Converted 300 kg to 2942.0 N using g = 9.80665 m/s^2."
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   },
   {
    "field": "domain",
    "value": "structural3d",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A space frame girder about 4 m long needs to support a 3 kN hoist at mid-span with minimum weight.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Space truss girder study",
   "brief": "A space frame girder about 4 m long needs to support a 3 kN hoist at mid-span with minimum weight.",
   "domain": "structural3d",
   "geometry": {
    "kind": "space-truss",
    "span_m": 4,
    "bays": 2,
    "width_m": 0.6666666666666666,
    "depthMin_m": 0.1,
    "depthMax_m": 1.3333333333333333,
    "areaMin_m2": 0.000002,
    "areaMax_m2": 0.001
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 3000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Stress x 2 <= yield",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.016,
     "label": "Deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)",
     "reason": "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.",
     "confidence": "high"
    },
    {
     "id": "assume-2",
     "field": "width",
     "value": "0.667 m (span / 6)",
     "reason": "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 aluminium is the engine's default alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "load",
     "value": "3000 N vertical at the midspan top node",
     "reason": "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "section",
     "value": "Solid round bars; Euler buckling with K = 1",
     "reason": "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "span / 250",
     "reason": "Serviceability deflection limit used as a generic preliminary-design value, not a code value.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "bracing",
     "value": "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan",
     "reason": "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.",
     "confidence": "medium"
    },
    {
     "id": "assume-9",
     "field": "analysisModel",
     "value": "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes",
     "reason": "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A space frame girder about 4 m long needs to support a 3 kN hoist at mid-span with minimum weight.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 4,
    "confidence": "high",
    "sourceSpan": "4 m"
   },
   {
    "field": "load_N",
    "value": 3000,
    "confidence": "high",
    "sourceSpan": "3 kN"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   },
   {
    "field": "domain",
    "value": "structural3d",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a 3D space truss girder in titanium.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Space truss girder study",
   "brief": "Design a 3D space truss girder in titanium.",
   "domain": "structural3d",
   "geometry": {
    "kind": "space-truss",
    "span_m": 3,
    "bays": 2,
    "width_m": 0.5,
    "depthMin_m": 0.075,
    "depthMax_m": 1,
    "areaMin_m2": 0.000002,
    "areaMax_m2": 0.001
   },
   "material": {
    "id": "titanium-6al-4v",
    "name": "Titanium Ti-6Al-4V",
    "youngsModulus_Pa": 113800000000,
    "density_kg_m3": 4430,
    "thermalConductivity_W_mK": 6.7,
    "yieldStrength_Pa": 880000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 2000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Stress x 2 <= yield",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.012,
     "label": "Deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "3.0 m",
     "reason": "No span was found in the brief; a 3 m span is the canonical space-truss demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "2000 N",
     "reason": "No load was found in the brief; 2 kN is the canonical space-truss demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)",
     "reason": "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.",
     "confidence": "high"
    },
    {
     "id": "assume-2",
     "field": "width",
     "value": "0.500 m (span / 6)",
     "reason": "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "load",
     "value": "2000 N vertical at the midspan top node",
     "reason": "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "section",
     "value": "Solid round bars; Euler buckling with K = 1",
     "reason": "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "deflectionLimit",
     "value": "span / 250",
     "reason": "Serviceability deflection limit used as a generic preliminary-design value, not a code value.",
     "confidence": "low"
    },
    {
     "id": "assume-7",
     "field": "bracing",
     "value": "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan",
     "reason": "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.",
     "confidence": "medium"
    },
    {
     "id": "assume-8",
     "field": "analysisModel",
     "value": "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes",
     "reason": "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a 3D space truss girder in titanium.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "material",
    "value": "titanium-6al-4v",
    "confidence": "high",
    "sourceSpan": "titanium"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   },
   {
    "field": "domain",
    "value": "structural3d",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 3D truss spanning 3 m with a 2 kN load, possibly 3 kN with the winter load case.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Space truss girder study",
   "brief": "A 3D truss spanning 3 m with a 2 kN load, possibly 3 kN with the winter load case.",
   "domain": "structural3d",
   "geometry": {
    "kind": "space-truss",
    "span_m": 3,
    "bays": 2,
    "width_m": 0.5,
    "depthMin_m": 0.075,
    "depthMax_m": 1,
    "areaMin_m2": 0.000002,
    "areaMax_m2": 0.001
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 2000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Stress x 2 <= yield",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.012,
     "label": "Deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)",
     "reason": "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.",
     "confidence": "high"
    },
    {
     "id": "assume-2",
     "field": "width",
     "value": "0.500 m (span / 6)",
     "reason": "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 aluminium is the engine's default alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "load",
     "value": "2000 N vertical at the midspan top node",
     "reason": "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "section",
     "value": "Solid round bars; Euler buckling with K = 1",
     "reason": "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "span / 250",
     "reason": "Serviceability deflection limit used as a generic preliminary-design value, not a code value.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "bracing",
     "value": "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan",
     "reason": "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.",
     "confidence": "medium"
    },
    {
     "id": "assume-9",
     "field": "analysisModel",
     "value": "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes",
     "reason": "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 3D truss spanning 3 m with a 2 kN load, possibly 3 kN with the winter load case.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 m"
   },
   {
    "field": "load_N",
    "value": 2000,
    "confidence": "high",
    "sourceSpan": "2 kN"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   },
   {
    "field": "domain",
    "value": "structural3d",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a robot arm that lifts a 2 kg payload anywhere within a 0.8 m reach with minimum motor torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "Design a robot arm that lifts a 2 kg payload anywhere within a 0.8 m reach with minimum motor torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.8,
    "linkMin_m": 0.12,
    "linkMax_m": 0.8,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.3464101615137755,
      "y_m": -0.19999999999999998
     },
     {
      "x_m": 0.4,
      "y_m": 0
     },
     {
      "x_m": 0.3464101615137755,
      "y_m": 0.19999999999999998
     },
     {
      "x_m": 0.20000000000000007,
      "y_m": 0.34641016151377546
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": -0.3
     },
     {
      "x_m": 0.6000000000000001,
      "y_m": 0
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": 0.3
     },
     {
      "x_m": 0.3000000000000001,
      "y_m": 0.5196152422706632
     },
     {
      "x_m": 0.692820323027551,
      "y_m": -0.39999999999999997
     },
     {
      "x_m": 0.8,
      "y_m": 0
     },
     {
      "x_m": 0.692820323027551,
      "y_m": 0.39999999999999997
     },
     {
      "x_m": 0.40000000000000013,
      "y_m": 0.6928203230275509
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 19.6133,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.002,
     "label": "Tip deflection <= 2.00 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "2.00 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a robot arm that lifts a 2 kg payload anywhere within a 0.8 m reach with minimum motor torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 kg",
    "note": "Given as a force; converted to mass with g = 9.80665 m/s^2."
   },
   {
    "field": "reach_m",
    "value": 0.8,
    "confidence": "high",
    "sourceSpan": "0.8 m"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Two-link planar manipulator, 5 kg payload, 1.2 m reach, steel links, safety factor 1.5, minimise peak joint torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "Two-link planar manipulator, 5 kg payload, 1.2 m reach, steel links, safety factor 1.5, minimise peak joint torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 1.2,
    "linkMin_m": 0.18,
    "linkMax_m": 1.2,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.5196152422706632,
      "y_m": -0.29999999999999993
     },
     {
      "x_m": 0.6,
      "y_m": 0
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": 0.29999999999999993
     },
     {
      "x_m": 0.30000000000000004,
      "y_m": 0.5196152422706631
     },
     {
      "x_m": 0.7794228634059948,
      "y_m": -0.4499999999999999
     },
     {
      "x_m": 0.8999999999999999,
      "y_m": 0
     },
     {
      "x_m": 0.7794228634059948,
      "y_m": 0.4499999999999999
     },
     {
      "x_m": 0.45000000000000007,
      "y_m": 0.7794228634059946
     },
     {
      "x_m": 1.0392304845413265,
      "y_m": -0.5999999999999999
     },
     {
      "x_m": 1.2,
      "y_m": 0
     },
     {
      "x_m": 1.0392304845413265,
      "y_m": 0.5999999999999999
     },
     {
      "x_m": 0.6000000000000001,
      "y_m": 1.0392304845413263
     }
    ]
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 49.033249999999995,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 1.5,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 1.5 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.003,
     "label": "Tip deflection <= 3.00 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "3.00 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-6",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Two-link planar manipulator, 5 kg payload, 1.2 m reach, steel links, safety factor 1.5, minimise peak joint torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 5,
    "confidence": "high",
    "sourceSpan": "5 kg",
    "note": "Given as a force; converted to mass with g = 9.80665 m/s^2."
   },
   {
    "field": "reach_m",
    "value": 1.2,
    "confidence": "high",
    "sourceSpan": "1.2 m"
   },
   {
    "field": "safetyFactor",
    "value": 1.5,
    "confidence": "high",
    "sourceSpan": "safety factor 1.5"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "steel"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a lightweight aluminium manipulator that carries 1 kg over a 0.5 m workspace.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightest manipulator study",
   "brief": "Design a lightweight aluminium manipulator that carries 1 kg over a 0.5 m workspace.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.5,
    "linkMin_m": 0.075,
    "linkMax_m": 0.5,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.21650635094610968,
      "y_m": -0.12499999999999999
     },
     {
      "x_m": 0.25,
      "y_m": 0
     },
     {
      "x_m": 0.21650635094610968,
      "y_m": 0.12499999999999999
     },
     {
      "x_m": 0.12500000000000003,
      "y_m": 0.21650635094610965
     },
     {
      "x_m": 0.3247595264191645,
      "y_m": -0.18749999999999997
     },
     {
      "x_m": 0.375,
      "y_m": 0
     },
     {
      "x_m": 0.3247595264191645,
      "y_m": 0.18749999999999997
     },
     {
      "x_m": 0.18750000000000006,
      "y_m": 0.3247595264191645
     },
     {
      "x_m": 0.43301270189221935,
      "y_m": -0.24999999999999997
     },
     {
      "x_m": 0.5,
      "y_m": 0
     },
     {
      "x_m": 0.43301270189221935,
      "y_m": 0.24999999999999997
     },
     {
      "x_m": 0.25000000000000006,
      "y_m": 0.4330127018922193
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 9.80665,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.00125,
     "label": "Tip deflection <= 1.25 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-6",
     "field": "deflectionLimit",
     "value": "1.25 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-7",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a lightweight aluminium manipulator that carries 1 kg over a 0.5 m workspace.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 1,
    "confidence": "high",
    "sourceSpan": "1 kg",
    "note": "Given as a force; converted to mass with g = 9.80665 m/s^2."
   },
   {
    "field": "reach_m",
    "value": 0.5,
    "confidence": "high",
    "sourceSpan": "0.5 m"
   },
   {
    "field": "material",
    "value": "aluminum-6061-t6",
    "confidence": "high",
    "sourceSpan": "aluminium"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Robot arm: payload 20 N, reach 600 mm; minimise torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "Robot arm: payload 20 N, reach 600 mm; minimise torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.6,
    "linkMin_m": 0.09,
    "linkMax_m": 0.6,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.2598076211353316,
      "y_m": -0.14999999999999997
     },
     {
      "x_m": 0.3,
      "y_m": 0
     },
     {
      "x_m": 0.2598076211353316,
      "y_m": 0.14999999999999997
     },
     {
      "x_m": 0.15000000000000002,
      "y_m": 0.25980762113533157
     },
     {
      "x_m": 0.3897114317029974,
      "y_m": -0.22499999999999995
     },
     {
      "x_m": 0.44999999999999996,
      "y_m": 0
     },
     {
      "x_m": 0.3897114317029974,
      "y_m": 0.22499999999999995
     },
     {
      "x_m": 0.22500000000000003,
      "y_m": 0.3897114317029973
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": -0.29999999999999993
     },
     {
      "x_m": 0.6,
      "y_m": 0
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": 0.29999999999999993
     },
     {
      "x_m": 0.30000000000000004,
      "y_m": 0.5196152422706631
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 20,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.0015,
     "label": "Tip deflection <= 1.50 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "1.50 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Robot arm: payload 20 N, reach 600 mm; minimise torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 2.0394324259558565,
    "confidence": "high",
    "sourceSpan": "20 N"
   },
   {
    "field": "reach_m",
    "value": 0.6,
    "confidence": "high",
    "sourceSpan": "600 mm"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A manipulator must lift 3000 g at 75 cm reach with minimum motor torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "A manipulator must lift 3000 g at 75 cm reach with minimum motor torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.75,
    "linkMin_m": 0.11249999999999999,
    "linkMax_m": 0.75,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.3247595264191645,
      "y_m": -0.18749999999999997
     },
     {
      "x_m": 0.375,
      "y_m": 0
     },
     {
      "x_m": 0.3247595264191645,
      "y_m": 0.18749999999999997
     },
     {
      "x_m": 0.18750000000000006,
      "y_m": 0.3247595264191645
     },
     {
      "x_m": 0.48713928962874675,
      "y_m": -0.28124999999999994
     },
     {
      "x_m": 0.5625,
      "y_m": 0
     },
     {
      "x_m": 0.48713928962874675,
      "y_m": 0.28124999999999994
     },
     {
      "x_m": 0.28125000000000006,
      "y_m": 0.4871392896287467
     },
     {
      "x_m": 0.649519052838329,
      "y_m": -0.37499999999999994
     },
     {
      "x_m": 0.75,
      "y_m": 0
     },
     {
      "x_m": 0.649519052838329,
      "y_m": 0.37499999999999994
     },
     {
      "x_m": 0.3750000000000001,
      "y_m": 0.649519052838329
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 19.6133,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.001875,
     "label": "Tip deflection <= 1.88 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-payload",
     "field": "payload",
     "value": "2 kg",
     "reason": "No payload mass or force was found in the brief; 2 kg is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "1.88 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A manipulator must lift 3000 g at 75 cm reach with minimum motor torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "reach_m",
    "value": 0.75,
    "confidence": "high",
    "sourceSpan": "75 cm"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Pick-and-place arm lifting a 4.4 lb part across a 24 in reach; minimize the actuator torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "Pick-and-place arm lifting a 4.4 lb part across a 24 in reach; minimize the actuator torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.8,
    "linkMin_m": 0.12,
    "linkMax_m": 0.8,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.3464101615137755,
      "y_m": -0.19999999999999998
     },
     {
      "x_m": 0.4,
      "y_m": 0
     },
     {
      "x_m": 0.3464101615137755,
      "y_m": 0.19999999999999998
     },
     {
      "x_m": 0.20000000000000007,
      "y_m": 0.34641016151377546
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": -0.3
     },
     {
      "x_m": 0.6000000000000001,
      "y_m": 0
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": 0.3
     },
     {
      "x_m": 0.3000000000000001,
      "y_m": 0.5196152422706632
     },
     {
      "x_m": 0.692820323027551,
      "y_m": -0.39999999999999997
     },
     {
      "x_m": 0.8,
      "y_m": 0
     },
     {
      "x_m": 0.692820323027551,
      "y_m": 0.39999999999999997
     },
     {
      "x_m": 0.40000000000000013,
      "y_m": 0.6928203230275509
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 19.6133,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.002,
     "label": "Tip deflection <= 2.00 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-payload",
     "field": "payload",
     "value": "2 kg",
     "reason": "No payload mass or force was found in the brief; 2 kg is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-reach",
     "field": "reach",
     "value": "0.8 m",
     "reason": "No reach or working radius was found in the brief; 0.8 m is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "2.00 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Pick-and-place arm lifting a 4.4 lb part across a 24 in reach; minimize the actuator torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "We want a planar two-link arm that can hold a two-kilogram load anywhere up to eighty centimetres from the base; the motors should be as small as possible.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "We want a planar two-link arm that can hold a two-kilogram load anywhere up to eighty centimetres from the base; the motors should be as small as possible.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.8,
    "linkMin_m": 0.12,
    "linkMax_m": 0.8,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.3464101615137755,
      "y_m": -0.19999999999999998
     },
     {
      "x_m": 0.4,
      "y_m": 0
     },
     {
      "x_m": 0.3464101615137755,
      "y_m": 0.19999999999999998
     },
     {
      "x_m": 0.20000000000000007,
      "y_m": 0.34641016151377546
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": -0.3
     },
     {
      "x_m": 0.6000000000000001,
      "y_m": 0
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": 0.3
     },
     {
      "x_m": 0.3000000000000001,
      "y_m": 0.5196152422706632
     },
     {
      "x_m": 0.692820323027551,
      "y_m": -0.39999999999999997
     },
     {
      "x_m": 0.8,
      "y_m": 0
     },
     {
      "x_m": 0.692820323027551,
      "y_m": 0.39999999999999997
     },
     {
      "x_m": 0.40000000000000013,
      "y_m": 0.6928203230275509
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 19.6133,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.002,
     "label": "Tip deflection <= 2.00 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-payload",
     "field": "payload",
     "value": "2 kg",
     "reason": "No payload mass or force was found in the brief; 2 kg is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-reach",
     "field": "reach",
     "value": "0.8 m",
     "reason": "No reach or working radius was found in the brief; 0.8 m is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "2.00 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "We want a planar two-link arm that can hold a two-kilogram load anywhere up to eighty centimetres from the base; the motors should be as small as possible.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Arm reach: 0.9 m. Payload: 1.5 kg. Objective: minimum torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "Arm reach: 0.9 m. Payload: 1.5 kg. Objective: minimum torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.9,
    "linkMin_m": 0.135,
    "linkMax_m": 0.9,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.38971143170299744,
      "y_m": -0.22499999999999998
     },
     {
      "x_m": 0.45,
      "y_m": 0
     },
     {
      "x_m": 0.38971143170299744,
      "y_m": 0.22499999999999998
     },
     {
      "x_m": 0.22500000000000006,
      "y_m": 0.3897114317029974
     },
     {
      "x_m": 0.5845671475544961,
      "y_m": -0.33749999999999997
     },
     {
      "x_m": 0.675,
      "y_m": 0
     },
     {
      "x_m": 0.5845671475544961,
      "y_m": 0.33749999999999997
     },
     {
      "x_m": 0.3375000000000001,
      "y_m": 0.5845671475544961
     },
     {
      "x_m": 0.7794228634059949,
      "y_m": -0.44999999999999996
     },
     {
      "x_m": 0.9,
      "y_m": 0
     },
     {
      "x_m": 0.7794228634059949,
      "y_m": 0.44999999999999996
     },
     {
      "x_m": 0.4500000000000001,
      "y_m": 0.7794228634059948
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 14.709975,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.0022500000000000003,
     "label": "Tip deflection <= 2.25 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "2.25 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Arm reach: 0.9 m. Payload: 1.5 kg. Objective: minimum torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 1.5,
    "confidence": "high",
    "sourceSpan": "1.5 kg",
    "note": "Given as a force; converted to mass with g = 9.80665 m/s^2."
   },
   {
    "field": "reach_m",
    "value": 0.9,
    "confidence": "high",
    "sourceSpan": "0.9 m"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a lightweight aluminium manipulator arm.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightest manipulator study",
   "brief": "Design a lightweight aluminium manipulator arm.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.8,
    "linkMin_m": 0.12,
    "linkMax_m": 0.8,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.3464101615137755,
      "y_m": -0.19999999999999998
     },
     {
      "x_m": 0.4,
      "y_m": 0
     },
     {
      "x_m": 0.3464101615137755,
      "y_m": 0.19999999999999998
     },
     {
      "x_m": 0.20000000000000007,
      "y_m": 0.34641016151377546
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": -0.3
     },
     {
      "x_m": 0.6000000000000001,
      "y_m": 0
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": 0.3
     },
     {
      "x_m": 0.3000000000000001,
      "y_m": 0.5196152422706632
     },
     {
      "x_m": 0.692820323027551,
      "y_m": -0.39999999999999997
     },
     {
      "x_m": 0.8,
      "y_m": 0
     },
     {
      "x_m": 0.692820323027551,
      "y_m": 0.39999999999999997
     },
     {
      "x_m": 0.40000000000000013,
      "y_m": 0.6928203230275509
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 19.6133,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.002,
     "label": "Tip deflection <= 2.00 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-payload",
     "field": "payload",
     "value": "2 kg",
     "reason": "No payload mass or force was found in the brief; 2 kg is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-reach",
     "field": "reach",
     "value": "0.8 m",
     "reason": "No reach or working radius was found in the brief; 0.8 m is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-6",
     "field": "deflectionLimit",
     "value": "2.00 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-7",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a lightweight aluminium manipulator arm.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "material",
    "value": "aluminum-6061-t6",
    "confidence": "high",
    "sourceSpan": "aluminium"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a robot arm with a 1 m reach and minimal joint torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "Design a robot arm with a 1 m reach and minimal joint torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 1,
    "linkMin_m": 0.15,
    "linkMax_m": 1,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.43301270189221935,
      "y_m": -0.24999999999999997
     },
     {
      "x_m": 0.5,
      "y_m": 0
     },
     {
      "x_m": 0.43301270189221935,
      "y_m": 0.24999999999999997
     },
     {
      "x_m": 0.25000000000000006,
      "y_m": 0.4330127018922193
     },
     {
      "x_m": 0.649519052838329,
      "y_m": -0.37499999999999994
     },
     {
      "x_m": 0.75,
      "y_m": 0
     },
     {
      "x_m": 0.649519052838329,
      "y_m": 0.37499999999999994
     },
     {
      "x_m": 0.3750000000000001,
      "y_m": 0.649519052838329
     },
     {
      "x_m": 0.8660254037844387,
      "y_m": -0.49999999999999994
     },
     {
      "x_m": 1,
      "y_m": 0
     },
     {
      "x_m": 0.8660254037844387,
      "y_m": 0.49999999999999994
     },
     {
      "x_m": 0.5000000000000001,
      "y_m": 0.8660254037844386
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 19.6133,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.0025,
     "label": "Tip deflection <= 2.50 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-payload",
     "field": "payload",
     "value": "2 kg",
     "reason": "No payload mass or force was found in the brief; 2 kg is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "2.50 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a robot arm with a 1 m reach and minimal joint torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "reach_m",
    "value": 1,
    "confidence": "high",
    "sourceSpan": "1 m"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A robot arm lifts a 2 kg (or sometimes 4 kg) payload within 0.8 m; minimise torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "A robot arm lifts a 2 kg (or sometimes 4 kg) payload within 0.8 m; minimise torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.8,
    "linkMin_m": 0.12,
    "linkMax_m": 0.8,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.3464101615137755,
      "y_m": -0.19999999999999998
     },
     {
      "x_m": 0.4,
      "y_m": 0
     },
     {
      "x_m": 0.3464101615137755,
      "y_m": 0.19999999999999998
     },
     {
      "x_m": 0.20000000000000007,
      "y_m": 0.34641016151377546
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": -0.3
     },
     {
      "x_m": 0.6000000000000001,
      "y_m": 0
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": 0.3
     },
     {
      "x_m": 0.3000000000000001,
      "y_m": 0.5196152422706632
     },
     {
      "x_m": 0.692820323027551,
      "y_m": -0.39999999999999997
     },
     {
      "x_m": 0.8,
      "y_m": 0
     },
     {
      "x_m": 0.692820323027551,
      "y_m": 0.39999999999999997
     },
     {
      "x_m": 0.40000000000000013,
      "y_m": 0.6928203230275509
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 19.6133,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.002,
     "label": "Tip deflection <= 2.00 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "2.00 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A robot arm lifts a 2 kg (or sometimes 4 kg) payload within 0.8 m; minimise torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 kg",
    "note": "Given as a force; converted to mass with g = 9.80665 m/s^2."
   },
   {
    "field": "reach_m",
    "value": 0.8,
    "confidence": "high",
    "sourceSpan": "0.8 m"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a robot arm that lifts 500 kg at a 3 m reach with minimum torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "Design a robot arm that lifts 500 kg at a 3 m reach with minimum torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 3,
    "linkMin_m": 0.44999999999999996,
    "linkMax_m": 3,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 1.299038105676658,
      "y_m": -0.7499999999999999
     },
     {
      "x_m": 1.5,
      "y_m": 0
     },
     {
      "x_m": 1.299038105676658,
      "y_m": 0.7499999999999999
     },
     {
      "x_m": 0.7500000000000002,
      "y_m": 1.299038105676658
     },
     {
      "x_m": 1.948557158514987,
      "y_m": -1.1249999999999998
     },
     {
      "x_m": 2.25,
      "y_m": 0
     },
     {
      "x_m": 1.948557158514987,
      "y_m": 1.1249999999999998
     },
     {
      "x_m": 1.1250000000000002,
      "y_m": 1.9485571585149868
     },
     {
      "x_m": 2.598076211353316,
      "y_m": -1.4999999999999998
     },
     {
      "x_m": 3,
      "y_m": 0
     },
     {
      "x_m": 2.598076211353316,
      "y_m": 1.4999999999999998
     },
     {
      "x_m": 1.5000000000000004,
      "y_m": 2.598076211353316
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 4903.325,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.0075,
     "label": "Tip deflection <= 7.50 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "7.50 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a robot arm that lifts 500 kg at a 3 m reach with minimum torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 kg",
    "note": "Given as a force; converted to mass with g = 9.80665 m/s^2."
   },
   {
    "field": "reach_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 m"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design the lightest heat sink that keeps a 40 W processor below 80 C in still air.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Design the lightest heat sink that keeps a 40 W processor below 80 C in still air.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 40,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design the lightest heat sink that keeps a 40 W processor below 80 C in still air.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 40,
    "confidence": "high",
    "sourceSpan": "40 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 80,
    "confidence": "high",
    "sourceSpan": "80 C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a heatsink that keeps a 40 W processor below 80 C with ambient air at 30 C.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Design a heatsink that keeps a 40 W processor below 80 C with ambient air at 30 C.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 30,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 40,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-2",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a heatsink that keeps a 40 W processor below 80 C with ambient air at 30 C.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 40,
    "confidence": "high",
    "sourceSpan": "40 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 80,
    "confidence": "high",
    "sourceSpan": "80 C"
   },
   {
    "field": "ambient_C",
    "value": 30,
    "confidence": "high",
    "sourceSpan": "30 C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Coolest possible aluminium heat sink for a 25 W module; the case must not exceed 70 C, ambient 20 C.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Coolest heat sink study",
   "brief": "Coolest possible aluminium heat sink for a 25 W module; the case must not exceed 70 C, ambient 20 C.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 20,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 25,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "resistance",
     "metric": "thermalResistance_K_W",
     "direction": "minimize",
     "label": "Thermal resistance"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 70,
     "label": "Base temperature <= 70 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-2",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Coolest possible aluminium heat sink for a 25 W module; the case must not exceed 70 C, ambient 20 C.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 25,
    "confidence": "high",
    "sourceSpan": "25 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 70,
    "confidence": "high",
    "sourceSpan": "70 C"
   },
   {
    "field": "ambient_C",
    "value": 20,
    "confidence": "high",
    "sourceSpan": "20 C"
   },
   {
    "field": "material",
    "value": "aluminum-6061-t6",
    "confidence": "high",
    "sourceSpan": "aluminium"
   },
   {
    "field": "objective",
    "value": "minimize thermal resistance",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Heat sink for a 0.05 kW chip, junction limit 85°C, ambient 25°C; minimise mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Heat sink for a 0.05 kW chip, junction limit 85°C, ambient 25°C; minimise mass.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 50,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 85,
     "label": "Base temperature <= 85 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-2",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Heat sink for a 0.05 kW chip, junction limit 85°C, ambient 25°C; minimise mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 50,
    "confidence": "high",
    "sourceSpan": "0.05 kW"
   },
   {
    "field": "maxTemperature_C",
    "value": 85,
    "confidence": "high",
    "sourceSpan": "85°C"
   },
   {
    "field": "ambient_C",
    "value": 25,
    "confidence": "high",
    "sourceSpan": "25°C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Passive cooler for a 30 W device; keep it below 358 K with the air at 298 K.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Passive cooler for a 30 W device; keep it below 358 K with the air at 298 K.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "2.0 m",
     "reason": "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Passive cooler for a 30 W device; keep it below 358 K with the air at 298 K.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": [
   "No structural keywords found; interpreted as a truss bridge because span/load were present."
  ]
 },
 {
  "brief": "A 60 W power module must stay under 176 °F with air at 77 °F; lightest aluminium heat sink.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "A 60 W power module must stay under 176 °F with air at 77 °F; lightest aluminium heat sink.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 60,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-temperature",
     "field": "temperatureLimit",
     "value": "80 C",
     "reason": "No temperature limit was found in the brief; 80 C is a common component case-temperature limit.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 60 W power module must stay under 176 °F with air at 77 °F; lightest aluminium heat sink.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 60,
    "confidence": "high",
    "sourceSpan": "60 W"
   },
   {
    "field": "material",
    "value": "aluminum-6061-t6",
    "confidence": "high",
    "sourceSpan": "aluminium"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "The regulator dissipates forty watts and must be held below eighty degrees Celsius in natural convection; use as little aluminium as possible.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "The regulator dissipates forty watts and must be held below eighty degrees Celsius in natural convection; use as little aluminium as possible.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "2.0 m",
     "reason": "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "The regulator dissipates forty watts and must be held below eighty degrees Celsius in natural convection; use as little aluminium as possible.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "material",
    "value": "aluminum-6061-t6",
    "confidence": "high",
    "sourceSpan": "aluminium"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": [
   "No structural keywords found; interpreted as a truss bridge because span/load were present."
  ]
 },
 {
  "brief": "Natural-convection heat sink: P = 15 W, Tmax = 75 C, Tamb = 35 C, steel.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Natural-convection heat sink: P = 15 W, Tmax = 75 C, Tamb = 35 C, steel.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 15,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 75,
     "label": "Base temperature <= 75 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Natural-convection heat sink: P = 15 W, Tmax = 75 C, Tamb = 35 C, steel.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 15,
    "confidence": "high",
    "sourceSpan": "15 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 75,
    "confidence": "high",
    "sourceSpan": "75 C"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "steel"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a lightweight heatsink.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Design a lightweight heatsink.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 40,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-power",
     "field": "power",
     "value": "40 W",
     "reason": "No dissipated power was found in the brief; 40 W is a representative natural-convection module.",
     "confidence": "low"
    },
    {
     "id": "assume-temperature",
     "field": "temperatureLimit",
     "value": "80 C",
     "reason": "No temperature limit was found in the brief; 80 C is a common component case-temperature limit.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a lightweight heatsink.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Keep a 20 W sensor module cool with the lightest passive heat sink.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Keep a 20 W sensor module cool with the lightest passive heat sink.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 20,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-temperature",
     "field": "temperatureLimit",
     "value": "80 C",
     "reason": "No temperature limit was found in the brief; 80 C is a common component case-temperature limit.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Keep a 20 W sensor module cool with the lightest passive heat sink.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 20,
    "confidence": "high",
    "sourceSpan": "20 W"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A heat sink for a chip dissipating 40 W (up to 60 W at peak) under 80 C.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "A heat sink for a chip dissipating 40 W (up to 60 W at peak) under 80 C.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 40,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A heat sink for a chip dissipating 40 W (up to 60 W at peak) under 80 C.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 40,
    "confidence": "high",
    "sourceSpan": "40 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 80,
    "confidence": "high",
    "sourceSpan": "80 C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Heat sink for a 40 W processor; the case should stay below 80 C, and the air is at 25 C, or 35 C in summer.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Heat sink for a 40 W processor; the case should stay below 80 C, and the air is at 25 C, or 35 C in summer.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 40,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Heat sink for a 40 W processor; the case should stay below 80 C, and the air is at 25 C, or 35 C in summer.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 40,
    "confidence": "high",
    "sourceSpan": "40 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 80,
    "confidence": "high",
    "sourceSpan": "80 C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a heatsink that keeps a 100 W processor below 80°C.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Design a heatsink that keeps a 100 W processor below 80°C.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 100,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a heatsink that keeps a 100 W processor below 80°C.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 100,
    "confidence": "high",
    "sourceSpan": "100 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 80,
    "confidence": "high",
    "sourceSpan": "80°C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Heat sink for 40 W with the case kept below 30 C in 25 C ambient air.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Heat sink for 40 W with the case kept below 30 C in 25 C ambient air.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 40,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 30,
     "label": "Base temperature <= 30 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Heat sink for 40 W with the case kept below 30 C in 25 C ambient air.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 40,
    "confidence": "high",
    "sourceSpan": "40 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 30,
    "confidence": "high",
    "sourceSpan": "30 C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a drone frame that minimizes mass while maintaining a safety factor of 2.",
  "supported": false,
  "reason": "This brief reads as a aerospace problem. NeuroForge currently solves planar truss bridges, planar manipulators and plate-fin heat sinks; aerospace domains are on the roadmap and are not simulated yet.",
  "detectedDomain": "aerospace"
 },
 {
  "brief": "Optimise the wing spar of a small UAV spanning 2 m for a 300 N lift load.",
  "supported": false,
  "reason": "This brief reads as a aerospace problem. NeuroForge currently solves planar truss bridges, planar manipulators and plate-fin heat sinks; aerospace domains are on the roadmap and are not simulated yet.",
  "detectedDomain": "aerospace"
 },
 {
  "brief": "Size an air duct with a 0.3 m diameter to deliver 500 cubic metres per hour with minimum pressure drop.",
  "supported": false,
  "reason": "This brief reads as a fluids problem. NeuroForge currently solves planar truss bridges, planar manipulators and plate-fin heat sinks; fluids domains are on the roadmap and are not simulated yet.",
  "detectedDomain": "fluids"
 },
 {
  "brief": "Design a 12 V buck converter delivering 3 A with the highest efficiency.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Design a 12 V buck converter delivering 3 A with the highest efficiency.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "2.0 m",
     "reason": "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a 12 V buck converter delivering 3 A with the highest efficiency.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": [
   "No structural keywords found; interpreted as a truss bridge because span/load were present."
  ]
 },
 {
  "brief": "Write a poem about bridges.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Write a poem about bridges.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "2.0 m",
     "reason": "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Write a poem about bridges.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": [
   "No structural keywords found; interpreted as a truss bridge because span/load were present."
  ]
 },
 {
  "brief": "Design a heat sink for a 40 W chip below 80 C together with the sheet-metal bracket that holds it, minimising their total mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Design a heat sink for a 40 W chip below 80 C together with the sheet-metal bracket that holds it, minimising their total mass.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 40,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a heat sink for a 40 W chip below 80 C together with the sheet-metal bracket that holds it, minimising their total mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 40,
    "confidence": "high",
    "sourceSpan": "40 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 80,
    "confidence": "high",
    "sourceSpan": "80 C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 2 m truss bridge carrying a 500 N midspan load plus a 200 N/m distributed deck load and a lateral wind load; minimise mass.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 2 m truss bridge carrying a 500 N midspan load plus a 200 N/m distributed deck load and a lateral wind load; minimise mass.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 2 m truss bridge carrying a 500 N midspan load plus a 200 N/m distributed deck load and a lateral wind load; minimise mass.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 3 m steel bridge carrying 1.2 kN with a safety factor of 1.8",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 3 m steel bridge carrying 1.2 kN with a safety factor of 1.8",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 3,
    "panels": 4,
    "depthMin_m": 0.07500000000000001,
    "depthMax_m": 0.8999999999999999,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "steel-a36",
    "name": "Structural steel (A36)",
    "youngsModulus_Pa": 200000000000,
    "density_kg_m3": 7850,
    "thermalConductivity_W_mK": 50,
    "yieldStrength_Pa": 250000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 1200,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 1.8,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 1.8 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 1.8 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.012,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 1200 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 3 m steel bridge carrying 1.2 kN with a safety factor of 1.8",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 m"
   },
   {
    "field": "load_N",
    "value": 1200,
    "confidence": "high",
    "sourceSpan": "1.2 kN"
   },
   {
    "field": "safetyFactor",
    "value": 1.8,
    "confidence": "high",
    "sourceSpan": "safety factor of 1.8"
   },
   {
    "field": "material",
    "value": "steel-a36",
    "confidence": "high",
    "sourceSpan": "steel"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "2 m bridge carrying 500 N; make it as stiff as possible.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Stiffest bridge within a mass budget",
   "brief": "2 m bridge carrying 500 N; make it as stiff as possible.",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "compliance",
     "metric": "compliance_J",
     "direction": "minimize",
     "label": "Compliance"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    },
    {
     "id": "mass-budget",
     "metric": "mass_kg",
     "op": "<=",
     "limit": 1.656249204262687,
     "label": "Mass <= 1.656 kg",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-mass-budget",
     "field": "massBudget",
     "value": "1.656 kg (mass of the conventional baseline)",
     "reason": "A stiffness objective needs a mass budget or the stiffest design is simply the heaviest; the brief gave none.",
     "confidence": "medium"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "2 m bridge carrying 500 N; make it as stiff as possible.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "objective",
    "value": "minimize compliance",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "2 m bridge, 500 N",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "2 m bridge, 500 N",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight structural alloy and matches the 'lightweight' intent.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "2 m bridge, 500 N",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 m"
   },
   {
    "field": "load_N",
    "value": 500,
    "confidence": "high",
    "sourceSpan": "500 N"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a lightweight 3D space truss spanning 3 meters that carries 2 kN at midspan.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Space truss girder study",
   "brief": "Design a lightweight 3D space truss spanning 3 meters that carries 2 kN at midspan.",
   "domain": "structural3d",
   "geometry": {
    "kind": "space-truss",
    "span_m": 3,
    "bays": 2,
    "width_m": 0.5,
    "depthMin_m": 0.075,
    "depthMax_m": 1,
    "areaMin_m2": 0.000002,
    "areaMax_m2": 0.001
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 2000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Stress x 2 <= yield",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.012,
     "label": "Deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)",
     "reason": "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.",
     "confidence": "high"
    },
    {
     "id": "assume-2",
     "field": "width",
     "value": "0.500 m (span / 6)",
     "reason": "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 aluminium is the engine's default alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "load",
     "value": "2000 N vertical at the midspan top node",
     "reason": "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "section",
     "value": "Solid round bars; Euler buckling with K = 1",
     "reason": "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "span / 250",
     "reason": "Serviceability deflection limit used as a generic preliminary-design value, not a code value.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "bracing",
     "value": "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan",
     "reason": "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.",
     "confidence": "medium"
    },
    {
     "id": "assume-9",
     "field": "analysisModel",
     "value": "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes",
     "reason": "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a lightweight 3D space truss spanning 3 meters that carries 2 kN at midspan.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 3,
    "confidence": "high",
    "sourceSpan": "3 meters"
   },
   {
    "field": "load_N",
    "value": 2000,
    "confidence": "high",
    "sourceSpan": "2 kN"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   },
   {
    "field": "domain",
    "value": "structural3d",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design a two-link arm that lifts a 2 kg payload anywhere within a 0.8 m reach with minimum motor torque.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Payload manipulator study",
   "brief": "Design a two-link arm that lifts a 2 kg payload anywhere within a 0.8 m reach with minimum motor torque.",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 0.8,
    "linkMin_m": 0.12,
    "linkMax_m": 0.8,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.3464101615137755,
      "y_m": -0.19999999999999998
     },
     {
      "x_m": 0.4,
      "y_m": 0
     },
     {
      "x_m": 0.3464101615137755,
      "y_m": 0.19999999999999998
     },
     {
      "x_m": 0.20000000000000007,
      "y_m": 0.34641016151377546
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": -0.3
     },
     {
      "x_m": 0.6000000000000001,
      "y_m": 0
     },
     {
      "x_m": 0.5196152422706632,
      "y_m": 0.3
     },
     {
      "x_m": 0.3000000000000001,
      "y_m": 0.5196152422706632
     },
     {
      "x_m": 0.692820323027551,
      "y_m": -0.39999999999999997
     },
     {
      "x_m": 0.8,
      "y_m": 0
     },
     {
      "x_m": 0.692820323027551,
      "y_m": 0.39999999999999997
     },
     {
      "x_m": 0.40000000000000013,
      "y_m": 0.6928203230275509
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 19.6133,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "torque",
     "metric": "peakTorque_Nm",
     "direction": "minimize",
     "label": "Peak torque"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.002,
     "label": "Tip deflection <= 2.00 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "2.00 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design a two-link arm that lifts a 2 kg payload anywhere within a 0.8 m reach with minimum motor torque.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2 kg",
    "note": "Given as a force; converted to mass with g = 9.80665 m/s^2."
   },
   {
    "field": "reach_m",
    "value": 0.8,
    "confidence": "high",
    "sourceSpan": "0.8 m"
   },
   {
    "field": "objective",
    "value": "minimize peak torque",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Design the lightest heat sink that keeps a 40 W processor below 80 C in still air.",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Heat sink study",
   "brief": "Design the lightest heat sink that keeps a 40 W processor below 80 C in still air.",
   "domain": "thermal",
   "geometry": {
    "kind": "fin-array",
    "baseWidth_m": 0.1,
    "baseDepth_m": 0.1,
    "ambient_C": 25,
    "finHeightMin_m": 0.005,
    "finHeightMax_m": 0.12,
    "finThicknessMin_m": 0.0005,
    "finThicknessMax_m": 0.006,
    "finPitchMin_m": 0.003,
    "finPitchMax_m": 0.04,
    "baseThicknessMin_m": 0.001,
    "baseThicknessMax_m": 0.012,
    "gapMin_m": 0.002
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "heat",
     "kind": "heat",
     "power_W": 40,
     "location": "base"
    }
   ],
   "supports": [],
   "safetyFactor": 1,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "temperature",
     "metric": "baseTemperature_C",
     "op": "<=",
     "limit": 80,
     "label": "Base temperature <= 80 C",
     "source": "user"
    },
    {
     "id": "gap",
     "metric": "gap_m",
     "op": ">=",
     "limit": 0.002,
     "label": "Clear gap between fins >= 2 mm",
     "source": "design-code"
    },
    {
     "id": "fins",
     "metric": "finCount",
     "op": ">=",
     "limit": 2,
     "label": "At least two fins",
     "source": "design-code"
    }
   ],
   "analysis": {
    "includeSelfWeight": false
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "ambient",
     "value": "25 C",
     "reason": "No ambient temperature was given; 25 C is the usual room-temperature rating condition.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "footprint",
     "value": "100 x 100 mm base",
     "reason": "No footprint was given; a 100 x 100 mm base is a common module size.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; extruded aluminium is the standard heat-sink material.",
     "confidence": "medium"
    },
    {
     "id": "assume-4",
     "field": "convection",
     "value": "Natural convection, Bar-Cohen and Rohsenow parallel-plate correlation",
     "reason": "No fan or airflow was specified; buoyancy-driven flow between the fins is the conservative baseline, and this correlation is the standard closed form for it.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "airProperties",
     "value": "Dry air at a 320 K film temperature (beta 1/320 K, nu 1.78e-5 m2/s, k 0.0278 W/mK, Pr 0.70)",
     "reason": "Properties are held at a fixed film temperature instead of being re-evaluated per design; the error is a few per cent over the 25 to 80 C range.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "orientation",
     "value": "Fins vertical, base at the component; no radiation, no spreading resistance, uniform base temperature",
     "reason": "Vertical fins are the natural-convection design orientation; radiation and spreading would lower temperatures slightly and are omitted to stay conservative and closed-form.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "finModel",
     "value": "Rectangular fins with the corrected-length adiabatic-tip efficiency tanh(mL)/(mL)",
     "reason": "Standard fin theory; valid when the Biot number across the fin thickness is small, which holds for thin aluminium fins.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Design the lightest heat sink that keeps a 40 W processor below 80 C in still air.",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "power_W",
    "value": 40,
    "confidence": "high",
    "sourceSpan": "40 W"
   },
   {
    "field": "maxTemperature_C",
    "value": 80,
    "confidence": "high",
    "sourceSpan": "80 C"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "A 2000 mm bridge for 1 kN, aluminium, L/250, safety 2.2",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "A 2000 mm bridge for 1 kN, aluminium, L/250, safety 2.2",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 1000,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 1000 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "A 2000 mm bridge for 1 kN, aluminium, L/250, safety 2.2",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 2,
    "confidence": "high",
    "sourceSpan": "2000 mm"
   },
   {
    "field": "load_N",
    "value": 1000,
    "confidence": "high",
    "sourceSpan": "1 kN"
   },
   {
    "field": "material",
    "value": "aluminum-6061-t6",
    "confidence": "high",
    "sourceSpan": "aluminium"
   },
   {
    "field": "deflectionRatio",
    "value": 250,
    "confidence": "high",
    "sourceSpan": "L/250"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Robot arm lifting 30 N within 1 m; light as possible",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightest manipulator study",
   "brief": "Robot arm lifting 30 N within 1 m; light as possible",
   "domain": "robotics",
   "geometry": {
    "kind": "planar-manipulator",
    "reach_m": 1,
    "linkMin_m": 0.15,
    "linkMax_m": 1,
    "radiusMin_m": 0.004,
    "radiusMax_m": 0.06,
    "wallRatio": 0.8,
    "taskPoints": [
     {
      "x_m": 0.43301270189221935,
      "y_m": -0.24999999999999997
     },
     {
      "x_m": 0.5,
      "y_m": 0
     },
     {
      "x_m": 0.43301270189221935,
      "y_m": 0.24999999999999997
     },
     {
      "x_m": 0.25000000000000006,
      "y_m": 0.4330127018922193
     },
     {
      "x_m": 0.649519052838329,
      "y_m": -0.37499999999999994
     },
     {
      "x_m": 0.75,
      "y_m": 0
     },
     {
      "x_m": 0.649519052838329,
      "y_m": 0.37499999999999994
     },
     {
      "x_m": 0.3750000000000001,
      "y_m": 0.649519052838329
     },
     {
      "x_m": 0.8660254037844387,
      "y_m": -0.49999999999999994
     },
     {
      "x_m": 1,
      "y_m": 0
     },
     {
      "x_m": 0.8660254037844387,
      "y_m": 0.49999999999999994
     },
     {
      "x_m": 0.5000000000000001,
      "y_m": 0.8660254037844386
     }
    ]
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "payload",
     "kind": "point",
     "magnitude_N": 30,
     "direction": "down",
     "location": "tip"
    }
   ],
   "supports": [
    {
     "kind": "fixed",
     "location": "base"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "reach",
     "metric": "unreachableFraction",
     "op": "<=",
     "limit": 0,
     "label": "Every task point reachable",
     "source": "user"
    },
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Link bending stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxTipDeflection_m",
     "op": "<=",
     "limit": 0.0025,
     "label": "Tip deflection <= 2.50 mm",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "taskPoints",
     "value": "12 points on arcs at 50, 75 and 100 % of the reach, -30 to +60 degrees",
     "reason": "The brief gives a reach but no task set; an arc across the working envelope exercises the arm at its extension limit and at raised positions.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 is a common lightweight arm alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "loadCase",
     "value": "Static hold at each task point, gravity only",
     "reason": "Static holding torque is the baseline sizing case; dynamic and inertial loads are outside this model.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "linkModel",
     "value": "Hollow circular tubes, inner radius 0.8 x outer, treated as Euler-Bernoulli cantilevers; link 2 mass and the payload act as a point load at the tip of link 1",
     "reason": "The simplest link section with a bending-efficient shape; the cantilever superposition is first-order and conservative for tip deflection.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "elbowChoice",
     "value": "Of the two inverse-kinematic solutions, the one with the lower peak joint torque is used at each point",
     "reason": "Elbow configuration is an operational freedom, not a design variable.",
     "confidence": "high"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "2.50 mm (reach / 400)",
     "reason": "No positioning accuracy was given; reach/400 is a typical static stiffness target for light arms.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "actuators",
     "value": "Joint torque is reported; no motor or gearbox model",
     "reason": "Actuator selection follows torque sizing and is outside this study.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Robot arm lifting 30 N within 1 m; light as possible",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "payload_kg",
    "value": 3.059148638933785,
    "confidence": "high",
    "sourceSpan": "30 N"
   },
   {
    "field": "reach_m",
    "value": 1,
    "confidence": "high",
    "sourceSpan": "1 m"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "high"
   }
  ],
  "warnings": []
 },
 {
  "brief": "Keep a 1 kW module under 90 C with ambient 40 C using titanium",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Lightweight bridge study",
   "brief": "Keep a 1 kW module under 90 C with ambient 40 C using titanium",
   "domain": "structural",
   "geometry": {
    "kind": "truss-bridge",
    "span_m": 2,
    "panels": 4,
    "depthMin_m": 0.05,
    "depthMax_m": 0.6,
    "areaMin_m2": 0.000001,
    "areaMax_m2": 0.0005,
    "sectionShape": "solid-round"
   },
   "material": {
    "id": "titanium-6al-4v",
    "name": "Titanium Ti-6Al-4V",
    "youngsModulus_Pa": 113800000000,
    "density_kg_m3": 4430,
    "thermalConductivity_W_mK": 6.7,
    "yieldStrength_Pa": 880000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 500,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Axial stress x 2 <= yield strength",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.008,
     "label": "Max deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-span",
     "field": "span",
     "value": "2.0 m",
     "reason": "No span or length was found in the brief; a 2 m span is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-load",
     "field": "load",
     "value": "500 N",
     "reason": "No load was found in the brief; 500 N is the canonical demonstration case.",
     "confidence": "low"
    },
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Pin at the left end, roller at the right end",
     "reason": "A simply supported span is the standard idealisation for a short bridge and makes the structure statically stable without over-constraining it.",
     "confidence": "medium"
    },
    {
     "id": "assume-2",
     "field": "loadCase",
     "value": "Single static point load of 500 N at midspan",
     "reason": "The brief gives one load and no position; midspan produces the largest bending demand on a simply supported span.",
     "confidence": "medium"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "deflectionLimit",
     "value": "Span / 250",
     "reason": "No serviceability limit was given; L/250 is a typical deflection limit for light structures.",
     "confidence": "medium"
    },
    {
     "id": "assume-5",
     "field": "sectionShape",
     "value": "Solid round bar (I = A^2 / 4 pi)",
     "reason": "Buckling checks need a section shape; solid round is the most conservative common choice for a given area.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "analysisModel",
     "value": "Linear-elastic, small-displacement, pin-jointed truss; self-weight included as lumped nodal loads",
     "reason": "This is the standard first-order model for a truss and is exact for its stated assumptions; it does not cover joint design, fatigue, dynamics or fabrication tolerances.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "Keep a 1 kW module under 90 C with ambient 40 C using titanium",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "material",
    "value": "titanium-6al-4v",
    "confidence": "high",
    "sourceSpan": "titanium"
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   }
  ],
  "warnings": [
   "No structural keywords found; interpreted as a truss bridge because span/load were present."
  ]
 },
 {
  "brief": "3-D truss spanning 4 m carrying 100 kg, stiffest design under 20 kg",
  "supported": true,
  "problem": {
   "version": 1,
   "title": "Space truss girder study",
   "brief": "3-D truss spanning 4 m carrying 100 kg, stiffest design under 20 kg",
   "domain": "structural3d",
   "geometry": {
    "kind": "space-truss",
    "span_m": 4,
    "bays": 2,
    "width_m": 0.6666666666666666,
    "depthMin_m": 0.1,
    "depthMax_m": 1.3333333333333333,
    "areaMin_m2": 0.000002,
    "areaMax_m2": 0.001
   },
   "material": {
    "id": "aluminum-6061-t6",
    "name": "Aluminum 6061-T6",
    "youngsModulus_Pa": 68900000000,
    "density_kg_m3": 2700,
    "thermalConductivity_W_mK": 167,
    "yieldStrength_Pa": 276000000
   },
   "loads": [
    {
     "id": "load-1",
     "kind": "point",
     "magnitude_N": 980.665,
     "direction": "down",
     "location": "midspan"
    }
   ],
   "supports": [
    {
     "kind": "pin",
     "location": "left-end"
    },
    {
     "kind": "roller",
     "location": "right-end"
    }
   ],
   "safetyFactor": 2,
   "objectives": [
    {
     "id": "mass",
     "metric": "mass_kg",
     "direction": "minimize",
     "label": "Mass"
    }
   ],
   "constraints": [
    {
     "id": "stress",
     "metric": "stressUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Stress x 2 <= yield",
     "source": "design-code"
    },
    {
     "id": "buckling",
     "metric": "bucklingUtilization",
     "op": "<=",
     "limit": 1,
     "label": "Compression x 2 <= Euler critical load",
     "source": "design-code"
    },
    {
     "id": "deflection",
     "metric": "maxDisplacement_m",
     "op": "<=",
     "limit": 0.016,
     "label": "Deflection <= span / 250",
     "source": "assumed"
    }
   ],
   "analysis": {
    "includeSelfWeight": true
   },
   "assumptions": [
    {
     "id": "assume-1",
     "field": "supports",
     "value": "Vertical support at all four bottom corners, plus x and y at one corner and x at its neighbour (seven restraints)",
     "reason": "Four vertical supports keep the girder symmetric; the three in-plane restraints remove the remaining rigid-body modes without restraining chord extension. Externally once indeterminate in the vertical direction, like a four-legged table.",
     "confidence": "high"
    },
    {
     "id": "assume-2",
     "field": "width",
     "value": "0.667 m (span / 6)",
     "reason": "No girder width was given; a sixth of the span is a typical proportion for a triangular space truss.",
     "confidence": "low"
    },
    {
     "id": "assume-3",
     "field": "safetyFactor",
     "value": "2.0",
     "reason": "No safety factor was given; 2.0 is a conservative preliminary-design value.",
     "confidence": "low"
    },
    {
     "id": "assume-4",
     "field": "material",
     "value": "Aluminum 6061-T6",
     "reason": "No material was specified; 6061-T6 aluminium is the engine's default alloy.",
     "confidence": "low"
    },
    {
     "id": "assume-5",
     "field": "load",
     "value": "980.665 N vertical at the midspan top node",
     "reason": "A single midspan point load is the canonical sizing case; distributed and lateral loads are outside this template.",
     "confidence": "medium"
    },
    {
     "id": "assume-6",
     "field": "section",
     "value": "Solid round bars; Euler buckling with K = 1",
     "reason": "The simplest section whose second moment follows from its area; tubular sections would raise buckling capacity for the same mass.",
     "confidence": "medium"
    },
    {
     "id": "assume-7",
     "field": "deflectionLimit",
     "value": "span / 250",
     "reason": "Serviceability deflection limit used as a generic preliminary-design value, not a code value.",
     "confidence": "low"
    },
    {
     "id": "assume-8",
     "field": "bracing",
     "value": "Each bay has X-bracing in the bottom face and one diagonal in each inclined face, mirrored about midspan",
     "reason": "X-bracing keeps the girder symmetric about its centre plane; single face diagonals are the minimum for a stable triangular girder. The optimiser sizes every brace independently.",
     "confidence": "medium"
    },
    {
     "id": "assume-9",
     "field": "analysisModel",
     "value": "Linear-elastic, pin-jointed, small displacements, self-weight lumped to nodes",
     "reason": "Standard first-order truss model; joints, fatigue, dynamics and fabrication tolerances are not covered.",
     "confidence": "high"
    }
   ],
   "provenance": {
    "source": "interpreter",
    "sourceText": "3-D truss spanning 4 m carrying 100 kg, stiffest design under 20 kg",
    "interpreter": "rule-based-v1"
   }
  },
  "extracted": [
   {
    "field": "span_m",
    "value": 4,
    "confidence": "high",
    "sourceSpan": "4 m"
   },
   {
    "field": "load_N",
    "value": 980.665,
    "confidence": "high",
    "sourceSpan": "100 kg",
    "note": "Converted 100 kg to 980.7 N using g = 9.80665 m/s^2."
   },
   {
    "field": "objective",
    "value": "minimize mass",
    "confidence": "medium"
   },
   {
    "field": "domain",
    "value": "structural3d",
    "confidence": "high"
   }
  ],
  "warnings": []
 }
] as const;
