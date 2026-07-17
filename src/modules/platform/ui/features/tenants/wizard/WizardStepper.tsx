/**
 * El stepper del wizard se promovió a componente compartido del panel
 * (FE4 lo usa para las máquinas de estado de DB y migración). Este re-export
 * conserva el import estable del wizard.
 */
export { StepIndicator as WizardStepper } from "../../../components/StepIndicator";
