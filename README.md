# k8s-autoscaling-demo

This project came out of wanting to actually see Kubernetes autoscaling work, 
not just read about it. I built a two-service application, put it under real 
load using k6, and watched the pods scale up in real time. The whole thing 
runs locally on Minikube so there's no cloud cost.

The interesting part isn't the app itself — it's everything around it. 
Namespaces, resource quotas, pod disruption budgets, and two separate HPAs 
all working together under load.

## What it does

A frontend service receives HTTP requests and calls a backend service to do 
CPU-heavy computation. Under load, both services scale independently based on 
their own CPU thresholds. The backend is the bottleneck by design — it runs 
a calculation loop that actually stresses the CPU, which is what triggers 
the autoscaler.

During load testing I saw the backend scale from 1 pod up to 5, and the 
frontend scale from 1 up to 3, all automatically. Once the load dropped, 
Kubernetes scaled back down on its own.

## Architecture
```
k6 load test → frontend service (scales 1-3) → backend service (scales 1-5)
```

Both services run in their own namespace with resource quotas, health checks, 
and pod disruption budgets configured.

## Project layout
```
k8s-autoscaling-demo/
├── services/
│   ├── frontend/
│   │   ├── index.js           # HTTP server, calls backend /compute endpoint
│   │   ├── package.json
│   │   └── Dockerfile
│   └── backend/
│       ├── index.js           # CPU-heavy computation endpoint
│       ├── package.json
│       └── Dockerfile
├── k8s/
│   ├── namespace.yaml         # Isolates all resources in 'demo' namespace
│   ├── configmap.yaml         # Non-sensitive config (version, log level)
│   ├── secret.yaml            # Sensitive config (base64 encoded)
│   ├── resource-quota.yaml    # Limits total CPU/memory/pods in namespace
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── hpa-backend.yaml       # Scales backend 1-5 pods at 50% CPU
│   ├── hpa-frontend.yaml      # Scales frontend 1-3 pods at 50% CPU
│   └── pdb.yaml               # Ensures at least 1 backend pod stays up
└── load-test/
    └── load-test.js           # k6 script, ramps to 100 virtual users
```

## How to run it

You'll need Minikube, kubectl, Docker and k6 installed.
```bash
# Start Minikube with enough resources
minikube start --driver=docker --cpus=2 --memory=3000

# Enable ingress and metrics
minikube addons enable ingress
minikube addons enable metrics-server

# Point Docker at Minikube's daemon
eval $(minikube docker-env)

# Build both images
docker build -t backend:1.0 services/backend
docker build -t frontend:1.0 services/frontend

# Deploy everything
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/resource-quota.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/hpa-backend.yaml
kubectl apply -f k8s/hpa-frontend.yaml
kubectl apply -f k8s/pdb.yaml

# Check everything is running
kubectl get all -n demo
```

Get the app URL:
```bash
minikube service frontend-service -n demo --url
```

## Running the load test

Open two terminals. In the first, watch the pods:
```bash
watch kubectl get pods -n demo
```

In the second, run the load test:
```bash
FRONTEND_URL=$(minikube service frontend-service -n demo --url)
k6 run --env BASE_URL=$FRONTEND_URL load-test/load-test.js
```

The load test ramps up to 100 virtual users over 3m30s. You'll see pods 
scale up in the first terminal as CPU climbs above 50%.

You can also watch the HPA directly:
```bash
kubectl get hpa -n demo -w
```

## Load test results I got
```
checks_succeeded:  98.54%
http_req_failed:   0.00%
http_req_duration: avg=479ms  p(95)=1.45s
requests:          15,961 total at 75 req/s
```

Backend scaled: 1 → 2 → 4 → 5 pods
Frontend scaled: 1 → 2 → 3 pods

## Cleanup
```bash
kubectl delete namespace demo
minikube stop
```

Deleting the namespace removes everything inside it at once.

## What I learned

- How namespaces provide isolation and why you'd use them in production
- How ConfigMaps and Secrets decouple config from container images
- How ResourceQuota prevents one app from consuming all cluster resources
- How Pod Disruption Budgets guarantee availability during maintenance
- How two HPAs can scale services independently based on their own metrics
- How to use k6 to generate realistic load and actually prove autoscaling works
- The difference between what gets scaled (replicas) and what triggers scaling (CPU metrics)

## Notes

Runs locally on Minikube — not deployed to a cloud provider. The backend 
computation is intentionally CPU-heavy to make autoscaling easy to trigger 
and observe. In a real production setup you'd want more sophisticated metrics 
beyond just CPU utilisation.
