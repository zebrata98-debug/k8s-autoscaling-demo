k8s-autoscaling-demo

Project layout
```
k8s-autoscaling-demo/
├── services/
│   ├── frontend/
│   │   ├── index.js           
│   │   ├── package.json
│   │   └── Dockerfile
│   └── backend/
│       ├── index.js           
│       ├── package.json
│       └── Dockerfile
├── k8s/
│   ├── namespace.yaml         
│   ├── configmap.yaml         
│   ├── secret.yaml            
│   ├── resource-quota.yaml    
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── hpa-backend.yaml       
│   ├── hpa-frontend.yaml      
│   └── pdb.yaml               
└── load-test/
    └── load-test.js           
```

minikube start --driver=docker --cpus=2 --memory=3000

minikube addons enable ingress

minikube addons enable metrics-server

eval $(minikube docker-env)

docker build -t backend:1.0 services/backend

docker build -t frontend:1.0 services/frontend

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


Check everything is running

kubectl get all -n demo


Get the app URL

minikube service frontend-service -n demo --url


  Test
  
watch kubectl get pods -n demo

FRONTEND_URL=$(minikube service frontend-service -n demo --url)

k6 run --env BASE_URL=$FRONTEND_URL load-test/load-test.js


I can also watch the HPA directly
kubectl get hpa -n demo -w


