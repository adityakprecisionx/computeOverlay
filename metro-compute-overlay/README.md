# Metro Compute Overlay - DFW

A Next.js 14 application for comparing cloud, colo data centers, and GridSite containers based on latency and cost for the Dallas-Fort Worth metro area.

## Features

- **Interactive Map**: Mapbox GL JS map with clickable nodes for data centers and cloud providers
- **Latency Calculation**: Real-time latency calculations based on distance and workload profiles
- **Cost Comparison**: Monthly cost breakdowns for different deployment options
- **Workload Profiles**: Pre-configured workload types (4K streaming, AR/VR, batch inference, etc.)
- **Node Filtering**: Filter by type, operator, and vacancy levels
- **GridSite Placement**: Add and configure hypothetical GridSite containers
- **Shareable URLs**: Deep links that preserve application state
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand with persistence
- **Maps**: Mapbox GL JS
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Mapbox access token

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd metro-compute-overlay
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_access_token_here
   ```

4. **Get a Mapbox access token**
   - Go to [Mapbox](https://www.mapbox.com/)
   - Create an account and get your access token
   - Add it to your `.env.local` file

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Setting Point of Use
1. Open the left drawer by clicking the menu button
2. Go to the "Location" tab
3. Enter an address or click "Click on Map" to set your location on the map

### Selecting Workload
1. In the left drawer, go to the "Workload" tab
2. Choose from available workload profiles:
   - 4K CV streaming
   - AR/VR
   - Batch inference
   - Real-time chat/LLM
   - Autonomous vehicle
   - Gaming render farm

### Comparing Nodes
1. Click on nodes on the map to select them
2. Go to the "Compare" tab in the left drawer
3. Click "Compare X Nodes" to open the comparison modal
4. View latency and cost breakdowns side-by-side

### Adding GridSite Containers
1. Click the purple "+" button in the bottom right
2. A default GridSite container will be added to the map
3. Configure pricing and settings as needed

### Filtering Nodes
1. Go to the "Filters" tab in the left drawer
2. Filter by:
   - Node type (colo, cloud, gridsite)
   - Operator (AWS, Google Cloud, etc.)
   - Vacancy level (low, medium, high)

### Sharing Views
1. Click the "Share" button in the top right
2. The current view URL will be copied to your clipboard
3. Share the URL to preserve the exact state

## Data Sources

### On-Map Nodes (DFW Area)
- Infomart Dallas (Equinix, Cologix, DataBank)
- Digital Realty 2323 Bryan St
- CyrusOne Carrollton/Allen
- Aligned Plano
- QTS Fort Worth/Irving
- DataBank DFW1/2/3/5
- CoreWeave Plano
- GCP us-south1 (Dallas)
- AWS Local Zone Dallas
- Azure Edge/POP Dallas
- Equinix Metal Dallas

### Off-Map Cloud Nodes
- AWS us-east-1 (N. Virginia)
- AWS us-west-1 (N. California)
- AWS us-west-2 (Oregon)
- AWS us-central-1 (Ohio)
- GCP us-central1 (Iowa)
- GCP us-east1 (S. Carolina)
- GCP us-west1 (Oregon)
- Azure South Central US (San Antonio)
- Azure East US (Virginia)
- Azure West US (California)

## Latency Calculations

The application uses deterministic heuristics to calculate latency:

### Cloud Latency Components
- Propagation delay (distance-based)
- Internet gateway
- Load balancer
- TLS handshake
- VPC routing
- ECS/EKS orchestration
- GPU cold start
- Model GPU load
- Queueing (multitenant)
- Noisy neighbor effects
- Data retrieval
- Longhaul POP/cross-AZ
- Serverless overhead

### Edge Latency Components
- Propagation delay (distance-based)
- Edge local routing
- Inference compute time

## Cost Calculations

### Cloud Costs
- GPU compute hours
- Egress bandwidth
- Storage
- Network services
- Support SLA
- Compliance uplift

### Edge/Colo Costs
- Power lease ($/kW/month)
- Local loop connectivity
- On-prem storage hardware
- Operations support
- Software stack/orchestration
- Compliance
- Redundancy

## Development

### Project Structure
```
src/
├── app/                 # Next.js app router
├── components/          # React components
├── lib/                 # Utilities and business logic
│   ├── constants.ts     # Application constants
│   ├── cost.ts          # Cost calculation functions
│   ├── distance.ts      # Distance calculation utilities
│   ├── latency.ts       # Latency calculation functions
│   ├── store.ts         # Zustand store
│   ├── types.ts         # TypeScript type definitions
│   ├── url-state.ts     # URL state management
│   └── utils.ts         # General utilities
└── seed/                # Seed data
    ├── nodes.json       # Node definitions
    └── workloads.json   # Workload profiles
```

### Adding New Nodes
1. Edit `src/seed/nodes.json`
2. Add node data following the Node interface
3. Include coordinates for on-map nodes
4. Omit coordinates for off-map cloud nodes

### Adding New Workloads
1. Edit `src/seed/workloads.json`
2. Add workload data following the Workload interface
3. Configure latency weights and cost flags
4. Set inference compute time ranges

### Customizing Calculations
- Modify `src/lib/latency.ts` for latency calculation changes
- Modify `src/lib/cost.ts` for cost calculation changes
- Update constants in `src/lib/constants.ts`

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your Mapbox token as an environment variable
4. Deploy

### Other Platforms
1. Build the application: `npm run build`
2. Start the production server: `npm start`
3. Set the `NEXT_PUBLIC_MAPBOX_TOKEN` environment variable

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open a GitHub issue or contact the development team.
