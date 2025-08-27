module github.com/victoralfred/hpa-agent

go 1.24

toolchain go1.24.5

require (
	github.com/joho/godotenv v1.5.1
	github.com/victoralfred/hpa-backend v0.0.0
	google.golang.org/grpc v1.75.0
	google.golang.org/protobuf v1.36.8
)

require (
	golang.org/x/net v0.42.0 // indirect
	golang.org/x/sys v0.35.0 // indirect
	golang.org/x/text v0.28.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250707201910-8d1bb00bc6a7 // indirect
)

replace github.com/victoralfred/hpa-backend => ../backend
