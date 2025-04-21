output "instance_security_group_id" {
  description = "ID of the instance security group"
  value       = aws_security_group.instance_sg.id
}

output "ec2_instance_profile" {
  description = "Name of the EC2 instance profile"
  value       = aws_iam_instance_profile.ec2_profile.name
}

output "ec2_role_name" {
  description = "Name of the EC2 IAM role"
  value       = aws_iam_role.ec2_role.name
}
