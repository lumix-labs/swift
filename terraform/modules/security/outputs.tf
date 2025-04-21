output "instance_security_group_id" {
  description = "Security group ID for the EC2 instance"
  value       = aws_security_group.instance_sg.id
}

output "ec2_role_arn" {
  description = "ARN of the EC2 IAM role"
  value       = aws_iam_role.ec2_role.arn
}

output "ec2_instance_profile" {
  description = "Instance profile for the EC2 instance"
  value       = aws_iam_instance_profile.ec2_profile.name
}
