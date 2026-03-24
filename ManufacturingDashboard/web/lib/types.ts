export interface ActualRow {
  deptCode: string;
  deptName: string;
  accountCode: string;
  accountName: string;
  wbsCode: string;
  wbsName: string;
  controlCycle: string;
  planM: number;
  totalPlanM: number;
  actualSumM: number;
  availableM: number;
  planY: number;
  totalPlanY: number;
  totalActualY: number;
  availableY: number;
  budgetBalance: number;
}

export interface PlanMonthly {
  plan: number;
  actual: number;
  balance: number;
}

export interface PlanRow {
  deptCode: string;
  deptName: string;
  accountCode: string;
  accountName: string;
  wbsCode: string;
  wbsName: string;
  totalBudget: number;
  totalActual: number;
  monthly: PlanMonthly[]; // index 0~11 = 1월~12월
}

export interface ActualFile {
  name: string;
  label: string;
  year: number;
  month: number;
  rows: ActualRow[];
}
