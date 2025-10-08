-- Insert sample items (only run this after you have a staff user)
insert into public.items (name, description, category, status, image_url) values
  ('MacBook Pro 16"', 'High-performance laptop for development work', 'Electronics', 'available', '/placeholder.svg?height=200&width=200'),
  ('Canon EOS R5', 'Professional mirrorless camera', 'Photography', 'available', '/placeholder.svg?height=200&width=200'),
  ('iPad Pro 12.9"', 'Tablet for presentations and note-taking', 'Electronics', 'available', '/placeholder.svg?height=200&width=200'),
  ('Projector - Epson', 'HD projector for meetings and presentations', 'Office Equipment', 'available', '/placeholder.svg?height=200&width=200'),
  ('Wireless Microphone', 'Professional wireless mic system', 'Audio', 'available', '/placeholder.svg?height=200&width=200'),
  ('Drone - DJI Mavic', 'Aerial photography drone', 'Photography', 'borrowed', '/placeholder.svg?height=200&width=200'),
  ('Standing Desk', 'Adjustable height standing desk', 'Furniture', 'available', '/placeholder.svg?height=200&width=200'),
  ('Conference Phone', 'Polycom conference speakerphone', 'Office Equipment', 'available', '/placeholder.svg?height=200&width=200')
on conflict do nothing;
