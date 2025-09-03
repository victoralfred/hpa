package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "github.com/victoralfred/hpa-shared/proto/agent/v1"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to server without TLS
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}

	conn, err := grpc.DialContext(ctx, "localhost:50052", opts...)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewAgentServiceClient(conn)

	// Register cluster
	req := &pb.RegisterClusterRequest{
		Name:     "integration-test-cluster",
		TenantId: "integration-test-tenant",
		Region:   "us-east-1",
		Provider: "test",
		Labels:   map[string]string{"environment": "test"},
		ClusterInfo: &pb.ClusterInfo{
			KubernetesVersion: "1.25.0",
			Provider:         "test",
			Region:          "us-east-1",
		},
	}

	resp, err := client.RegisterCluster(ctx, req)
	if err != nil {
		log.Fatalf("Failed to register cluster: %v", err)
	}

	fmt.Printf("CLUSTER_ID=%s\n", resp.ClusterId)
	fmt.Printf("AGENT_TOKEN=%s\n", resp.AgentToken)
}
