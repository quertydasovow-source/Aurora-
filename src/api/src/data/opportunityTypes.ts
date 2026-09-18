export type Opportunity = {
  id: string;
  title: string;
  provider: string;
  type: string;
  skills: string[];
  ageRequirements: string | null;
  language: string;
  format: string;
  cost: number | null;
  currency: string | null;
  deadline: string | null;
  officialUrl: string;
  checkedAt: string;
  verificationStatus: 'verified' | 'unverified';
};

export type OpportunityCatalog = {
  schemaVersion: number;
  checkedAt: string;
  notice: string;
  opportunities: Opportunity[];
};
