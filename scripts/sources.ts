// The State of Oklahoma's purchase card (P-card) transactions, published on
// data.ok.gov as one file per month. Each file holds the transactions that
// posted that month, so our year (purchases from Jul 1, 2025 to Jun 30, 2026)
// takes all 12 files of fiscal year 2026, plus the first 3 of fiscal 2027 for
// the 1,533 purchases that posted late.
//
// Each file is pinned to a SHA-256 checksum. Late purchases keep trickling
// into newer files and the state can replace a file at any time; pinning
// means the numbers in the app only change when we choose to change them.

export interface Source {
  /** The month the file covers, as YYYY-MM. Also its file name in data/raw. */
  readonly month: string;
  readonly url: string;
  readonly sha256: string;
}

const FY2026 = 'https://data.ok.gov/dataset/2423b1dc-dc91-4d8e-aed8-f94dfaadb999/resource';
const FY2027 = 'https://data.ok.gov/dataset/ffbfb29d-b00d-4cd0-a12d-59079c2360b3/resource';

export const SOURCES: readonly Source[] = [
  {
    month: '2025-07',
    url: `${FY2026}/285c4942-0452-4d6f-afe2-28c511953087/download/pcard_public_202507.csv`,
    sha256: '8e08a5be33fe508d5ae1bc0372df11b845210ad685ae5c311670b5e774f7fc3b',
  },
  {
    month: '2025-08',
    url: `${FY2026}/7dcef737-2c6f-42b9-9a56-583024b476d4/download/pcard_public_202508.csv`,
    sha256: 'cf4fe72536994afb33b43c509c2a0ebe3e9e41918b2e28b7c81607f1ff26f1e6',
  },
  {
    month: '2025-09',
    url: `${FY2026}/4fe5d2dc-7e07-421f-8687-4fb029b80b1f/download/pcard_public_202509.csv`,
    sha256: '454d2348a7bc76a4987319ddc3a736d3fff52050f6e6fd30622cb8fa61af7681',
  },
  {
    month: '2025-10',
    url: `${FY2026}/abbb985a-2e5c-4dee-b63a-27dcc00ec340/download/pcard_public_202510_without-row-id.csv`,
    sha256: 'e4c72841f7e48881c6b68fb902fafca69680e52d92233450d6fbdde140e70534',
  },
  {
    month: '2025-11',
    url: `${FY2026}/0e10001e-4a00-42bd-88be-8cc05d490b88/download/pcard_public_202511_withoutrowid-.csv`,
    sha256: '81ab951fdf563ddcd54df4097c39b78490cc30579fd3295bc91ff0e03e1c359f',
  },
  {
    month: '2025-12',
    url: `${FY2026}/5e70a8da-e91c-4105-b617-49f5115dd3dd/download/pcard_public_202512_without-row-id.csv`,
    sha256: 'c508dd64449d1cc5526b6a2072185e28cbc04a2b03972c53b498ed94b34faa3f',
  },
  {
    // The URL says 202602, the same name as February's file, but every row posted in January.
    month: '2026-01',
    url: `${FY2026}/00e40cda-a655-4e1d-bcc3-192bd5d51f68/download/pcard_public_202602_without-row-id-.csv`,
    sha256: '19b091ab51d7e6e9bc1bc96d6846ca19c143dceb1eb40054c96d913df1a26570',
  },
  {
    month: '2026-02',
    url: `${FY2026}/c5ef9a03-ad36-4946-b88b-46f730a6b062/download/pcard_public_202602_without-row-id-.csv`,
    sha256: 'b81122f551b61cfda33e3437dc21a8b4dae95ee494fb05302476b25d1a6202a4',
  },
  {
    month: '2026-03',
    url: `${FY2026}/88346d3a-5c26-43e3-9f1e-e59ce1f36f8c/download/pcard_public_202603_without-rowid.csv`,
    sha256: '56926828ff9f480bb124e815c8811e9eb460df717479c00fccf67738ff41adb8',
  },
  {
    month: '2026-04',
    url: `${FY2026}/0779ae81-8e92-47fe-9a1f-03d538868ca2/download/pcard_public_202604_without_row_id.csv`,
    sha256: '864a3d2b084d95a1539f1a73eeb4d037c8fa9bb5c33e88a7888bd96af01a127d',
  },
  {
    // The URL says 202606, but every row posted in May.
    month: '2026-05',
    url: `${FY2026}/0efd2a1f-70ac-4a58-8b9a-c157784e0e5a/download/pcard_public_202606_without_row_id.csv`,
    sha256: 'c08ace2c6282e681656a7652b73fbb35f0884b2715b444cedf10fdd6e1b37d64',
  },
  {
    month: '2026-06',
    url: `${FY2026}/3fd100b7-e12b-49e4-8f7c-fff33b8bbc0c/download/pcard_public_202606_without_rox_id.csv`,
    sha256: '0a616243a20f119ec73affe29cac93aba283b76be259cf13714c0f5d4b5f9170',
  },
  {
    month: '2026-07',
    url: `${FY2027}/3924af9a-183a-4d3a-ae0e-7370d9d5f137/download/pcard_public_202607.csv`,
    sha256: 'def771034e6b1ea2b94afa9c6b4aac3040b18397541f95c834b8b3ff5e9d6062',
  },
  {
    month: '2026-08',
    url: `${FY2027}/d0e7e450-702d-4191-8b78-24e0e33c92af/download/pcard_public_202608.csv`,
    sha256: '1b2d737cd972b7f9972e99afb1300f00e91768dc2b55c608ffb5a9215ece1259',
  },
  {
    month: '2026-09',
    url: `${FY2027}/38f5991d-cab8-4198-91d8-b35abe1497c9/download/pcard_public_202609.csv`,
    sha256: '2086972cd5c884fd70e7319e632196b89eec7eb568042ae7a3e2c9001b0771e1',
  },
];
